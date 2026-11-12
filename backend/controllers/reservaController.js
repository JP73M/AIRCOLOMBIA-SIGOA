const crypto = require('crypto');
const { pool } = require('../config/database');

const preciosServicios = {
  asiento: { standard:25000, window:35000, aisle:35000, premium:65000 },
  equipaje: { '15':70000, '23':110000, '32':150000 },
  mascota: { cabin:120000, hold:220000 },
  seguro: { basic:35000, premium:65000 },
  alimentacion: { vegetarian:30000, vegan:35000, gluten:35000, special:45000 },
  prioridad: { priority:40000 },
  vip: { national:85000, international:130000 },
  transporte: { standard:60000, premium:120000 }
};
const idsServicios = { asiento:8, equipaje:1, mascota:2, seguro:3, alimentacion:4, prioridad:5, vip:6, transporte:7 };
const metodos = { pse:'PSE', card:'TARJETA', transfer:'TRANSFERENCIA' };
const bad = (message, status=400) => Object.assign(new Error(message), {status});
const texto = (x, max=150) => String(x ?? '').trim().slice(0,max);

exports.crear = async (req,res) => {
  const { reserva, compra, metodo, referencia } = req.body || {};
  if (!reserva || !compra || !Array.isArray(reserva.pasajeros) || !reserva.pasajeros.length || reserva.pasajeros.length > 12 || !metodos[metodo]) {
    return res.status(400).json({mensaje:'Faltan datos válidos de la compra.'});
  }
  const codigo = texto(reserva.codigo,20);
  if (!/^AC-[A-Z0-9]{8}$/.test(codigo)) return res.status(400).json({mensaje:'Código de reserva inválido.'});
  let db;
  try {
    db = await pool.getConnection();
    await db.beginTransaction();
    const [ya] = await db.query('SELECT id FROM reservas WHERE codigo=? FOR UPDATE',[codigo]);
    if (ya.length) throw bad('Esta reserva ya fue registrada. Consulta su código en Gestionar reserva.',409);
    const tramos = [{tipo:'IDA', vuelo:reserva.vuelos?.vueloIda}, ...(reserva.vuelos?.vueloRegreso ? [{tipo:'REGRESO', vuelo:reserva.vuelos.vueloRegreso}] : [])];
    if (!tramos[0].vuelo) throw bad('No se seleccionó vuelo de ida.');
    const pasajeros = reserva.pasajeros;
    const vuelos = [];
    let totalVuelos = 0;
    for (const tramo of tramos) {
      const id = Number(tramo.vuelo.id);
      if (!Number.isInteger(id) || id < 1) throw bad('Identificador de vuelo inválido.');
      const [rows] = await db.query(`SELECT v.id,v.numero_vuelo,v.salida,v.estado,t.id tarifa_id,t.precio,t.cupos_disponibles,t.clase
        FROM vuelos v JOIN tarifas t ON t.vuelo_id=v.id
        WHERE v.id=? AND t.clase=? FOR UPDATE`,[id,texto(tramo.vuelo.clase,20).toUpperCase()]);
      const item = rows[0];
      if (!item || item.numero_vuelo !== tramo.vuelo.numero || item.estado !== 'PROGRAMADO' || new Date(item.salida) <= new Date()) throw bad('El vuelo seleccionado ya no está disponible.');
      if (item.cupos_disponibles < pasajeros.length) throw bad('No hay cupos suficientes para todos los pasajeros.');
      totalVuelos += Number(item.precio)*pasajeros.length;
      vuelos.push({...item,tipo:tramo.tipo});
    }
    const servicios = [];
    let totalServicios = 0;
    const seleccion = Array.isArray(compra.servicios) ? compra.servicios : [];
    if (seleccion.length && seleccion.length !== pasajeros.length) throw bad('La cantidad de pasajeros y servicios no coincide.');
    for (let i=0;i<seleccion.length;i++) {
      for (const [clave,valor] of Object.entries(seleccion[i].servicios || {})) {
        if (!valor) continue;
        const precio = preciosServicios[clave]?.[String(valor)];
        if (precio === undefined) throw bad('Servicio adicional no reconocido: '+clave);
        servicios.push({indice:i,servicioId:idsServicios[clave],detalle:`${clave}: ${valor}`,precio});
        totalServicios += precio;
      }
    }
    const total = totalVuelos + totalServicios;
    const comprador = reserva.comprador || {};
    const nombre = texto([comprador.nombres,comprador.apellidos].filter(Boolean).join(' ') || comprador.nombres);
    const correo = texto(comprador.correo);
    if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw bad('Nombre o correo del comprador inválidos.');
    const [r] = await db.query(`INSERT INTO reservas (codigo,usuario_id,comprador_nombre,comprador_correo,comprador_telefono,estado,total)
      VALUES (?,NULL,?,?,?,'PAGADA',?)`,[codigo,nombre,correo,texto(comprador.telefono,30),total]);
    const reservaId = r.insertId;
    const pasajeroIds=[];
    for (const p of pasajeros) {
      if (!texto(p.nombres) || !texto(p.apellidos) || !texto(p.tipoDocumento,30) || !texto(p.documento,40)) throw bad('Datos incompletos de pasajero.');
      const [existing] = await db.query('SELECT id FROM pasajeros WHERE tipo_documento=? AND documento=?', [texto(p.tipoDocumento,30),texto(p.documento,40)]);
      let pid=existing[0]?.id;
      if (!pid) {
        const [ins]=await db.query(`INSERT INTO pasajeros (nombres,apellidos,tipo_documento,documento,fecha_nacimiento,nacionalidad,correo,telefono)
          VALUES (?,?,?,?,?,?,?,?)`,[texto(p.nombres,100),texto(p.apellidos,100),texto(p.tipoDocumento,30),texto(p.documento,40), /^\d{4}-\d{2}-\d{2}$/.test(p.fechaNacimiento || '') ? p.fechaNacimiento : null, texto(p.nacionalidad,80)||null,texto(p.correo)||null,texto(p.telefono,30)||null]);
        pid=ins.insertId;
      }
      pasajeroIds.push(pid);
      await db.query('INSERT INTO reserva_pasajeros (reserva_id,pasajero_id) VALUES (?,?)',[reservaId,pid]);
    }
    for (const v of vuelos) {
      await db.query('INSERT INTO reserva_vuelos (reserva_id,vuelo_id,tipo_trayecto,tarifa_id,precio) VALUES (?,?,?,?,?)',[reservaId,v.id,v.tipo,v.tarifa_id,v.precio]);
      await db.query('UPDATE tarifas SET cupos_disponibles=cupos_disponibles-? WHERE id=?',[pasajeros.length,v.tarifa_id]);
    }
    for (const s of servicios) await db.query('INSERT INTO reserva_servicios (reserva_id,pasajero_id,servicio_id,detalle,precio) VALUES (?,?,?,?,?)',[reservaId,pasajeroIds[s.indice],s.servicioId,s.detalle,s.precio]);
    await db.query(`INSERT INTO pagos (reserva_id,metodo,referencia,valor,estado,fecha_pago) VALUES (?,?,?,?,'APROBADO',NOW())`,[reservaId,metodos[metodo],texto(referencia,100)||`DEMO-${crypto.randomUUID()}`,total]);
    const tiquetes=[];
    for (let i=0;i<pasajeros.length;i++) for (const v of vuelos) {
      const numero=`AC${crypto.randomBytes(10).toString('hex').toUpperCase()}`;
      await db.query('INSERT INTO tiquetes (reserva_id,pasajero_id,vuelo_id,numero_tiquete,estado) VALUES (?,?,?, ?,\'EMITIDO\')',[reservaId,pasajeroIds[i],v.id,numero]);
      tiquetes.push({numero,pasajero:`${pasajeros[i].nombres} ${pasajeros[i].apellidos}`,documento:pasajeros[i].documento,vueloIda:reserva.vuelos.vueloIda.numero,vueloRegreso:reserva.vuelos.vueloRegreso?.numero||null,reserva:codigo,fechaEmision:new Date().toISOString()});
    }
    await db.query('INSERT INTO auditoria (usuario_id,accion,descripcion,direccion_ip) VALUES (NULL,?,?,?)',['COMPRA DEMO',`Reserva ${codigo} por COP ${total}`,req.ip]);
    await db.commit();
    res.status(201).json({mensaje:'Compra de demostración registrada en MySQL.',codigo,total,tiquetes,estado:'PAGADA'});
  } catch(e) {
    if(db) await db.rollback().catch(()=>{});
    console.error('Error registrando compra:',e);
    res.status(e.status||500).json({mensaje:e.status?e.message:'No se pudo registrar la compra en MySQL.'});
  } finally { if(db) db.release(); }
};

exports.consultar = async (req,res) => {
  try {
    const codigo=texto(req.params.codigo,20);
    const apellido=texto(req.query.apellido,100).toLocaleLowerCase('es');
    if (!apellido) return res.status(400).json({mensaje:'Debes indicar el apellido del pasajero.'});
    const [rs]=await pool.query(`SELECT r.id,r.codigo,r.estado,r.total,r.fecha_reserva,r.comprador_nombre,r.comprador_correo FROM reservas r
      WHERE r.codigo=? AND EXISTS (SELECT 1 FROM reserva_pasajeros rp JOIN pasajeros p ON p.id=rp.pasajero_id WHERE rp.reserva_id=r.id AND LOWER(p.apellidos) LIKE ?)`,[codigo,`%${apellido}%`]);
    if(!rs.length) return res.status(404).json({mensaje:'No encontramos la reserva con ese código y apellido.'});
    const r=rs[0];
    const [ps]=await pool.query('SELECT p.nombres,p.apellidos,p.tipo_documento tipoDocumento,p.documento FROM pasajeros p JOIN reserva_pasajeros rp ON rp.pasajero_id=p.id WHERE rp.reserva_id=?',[r.id]);
    const [vs]=await pool.query(`SELECT rv.tipo_trayecto tipo,v.id,v.numero_vuelo numero,ao.codigo_iata origen,ad.codigo_iata destino,DATE_FORMAT(v.salida,'%Y-%m-%d') fecha,DATE_FORMAT(v.salida,'%H:%i') salida,DATE_FORMAT(v.llegada,'%H:%i') llegada,rv.precio,t.clase FROM reserva_vuelos rv JOIN vuelos v ON v.id=rv.vuelo_id JOIN aeropuertos ao ON ao.id=v.aeropuerto_origen JOIN aeropuertos ad ON ad.id=v.aeropuerto_destino LEFT JOIN tarifas t ON t.id=rv.tarifa_id WHERE rv.reserva_id=?`,[r.id]);
    const [ts]=await pool.query('SELECT numero_tiquete numero,fecha_emision fechaEmision,estado FROM tiquetes WHERE reserva_id=?',[r.id]);
    res.json({reserva:{codigo:r.codigo,estado:r.estado==='PAGADA'?'PAGADA - TIQUETES EMITIDOS':r.estado,total:Number(r.total),fechaCreacion:r.fecha_reserva,pasajeros:ps,vuelos:{vueloIda:vs.find(v=>v.tipo==='IDA')||null,vueloRegreso:vs.find(v=>v.tipo==='REGRESO')||null},tiquetes:ts}});
  } catch(e) {console.error(e);res.status(500).json({mensaje:'Error consultando la reserva.'});}
};

exports.reportes = async (_req,res) => {
  try {
    const [reservas]=await pool.query(`SELECT r.codigo,r.fecha_reserva fecha,r.estado,r.total,COUNT(DISTINCT rp.pasajero_id) pasajeros,
      CONCAT(COALESCE(ao.codigo_iata,'N/D'),' → ',COALESCE(ad.codigo_iata,'N/D')) ruta,
      (SELECT COUNT(*) FROM tiquetes t WHERE t.reserva_id=r.id) tiquetes
      FROM reservas r LEFT JOIN reserva_pasajeros rp ON rp.reserva_id=r.id
      LEFT JOIN reserva_vuelos rv ON rv.reserva_id=r.id AND rv.tipo_trayecto='IDA'
      LEFT JOIN vuelos v ON v.id=rv.vuelo_id LEFT JOIN aeropuertos ao ON ao.id=v.aeropuerto_origen LEFT JOIN aeropuertos ad ON ad.id=v.aeropuerto_destino
      GROUP BY r.id ORDER BY r.fecha_reserva DESC`);
    const [servicios]=await pool.query('SELECT s.nombre,COUNT(*) cantidad FROM reserva_servicios rs JOIN servicios s ON s.id=rs.servicio_id GROUP BY s.id,s.nombre');
    res.json({reservas,servicios});
  }catch(e){console.error(e);res.status(500).json({mensaje:'Error consultando reportes.'});}
};

exports.cancelar = async(req,res) => {
  const codigo=texto(req.params.codigo,20),apellido=texto(req.body?.apellido,100).toLowerCase();
  if(!apellido) return res.status(400).json({mensaje:'Falta el apellido para validar la reserva.'});
  let db;
  try {
    db=await pool.getConnection();await db.beginTransaction();
    const [rs]=await db.query(`SELECT r.id,r.estado FROM reservas r WHERE r.codigo=? AND EXISTS (SELECT 1 FROM reserva_pasajeros rp JOIN pasajeros p ON p.id=rp.pasajero_id WHERE rp.reserva_id=r.id AND LOWER(p.apellidos) LIKE ?) FOR UPDATE`,[codigo,`%${apellido}%`]);
    if(!rs.length) throw bad('Reserva no encontrada.',404);
    if(rs[0].estado!=='PAGADA') throw bad('La reserva no está en estado PAGADA.',409);
    await db.query("UPDATE reservas SET estado='CANCELACION_SOLICITADA' WHERE id=?",[rs[0].id]);
    await db.query("INSERT INTO cancelaciones (reserva_id,motivo,valor_reembolso,estado) VALUES (?,?,0,'SOLICITADA')",[rs[0].id,texto(req.body?.motivo,255)||'Solicitud desde la web']);
    await db.query('INSERT INTO auditoria (accion,descripcion,direccion_ip) VALUES (?,?,?)',['CANCELACION SOLICITADA',codigo,req.ip]);
    await db.commit();res.json({mensaje:'Solicitud de cancelación guardada en MySQL. Pendiente de revisión.',estado:'CANCELACION_SOLICITADA'});
  }catch(e){if(db)await db.rollback().catch(()=>{});console.error(e);res.status(e.status||500).json({mensaje:e.status?e.message:'Error registrando cancelación.'});}finally{if(db)db.release();}
};

exports.solicitarCambio = async(req,res) => {
  const codigo=texto(req.params.codigo,20),apellido=texto(req.body?.apellido,100).toLowerCase();
  const nuevoId=Number(req.body?.vueloNuevoId), tipo=req.body?.tipo==='REGRESO'?'REGRESO':'IDA';
  if(!apellido||!Number.isInteger(nuevoId)||nuevoId<1) return res.status(400).json({mensaje:'Datos incompletos del cambio.'});
  let db;
  try {
    db=await pool.getConnection();await db.beginTransaction();
    const [rs]=await db.query(`SELECT r.id,r.estado FROM reservas r WHERE r.codigo=? AND EXISTS (SELECT 1 FROM reserva_pasajeros rp JOIN pasajeros p ON p.id=rp.pasajero_id WHERE rp.reserva_id=r.id AND LOWER(p.apellidos) LIKE ?) FOR UPDATE`,[codigo,`%${apellido}%`]);
    if(!rs.length)throw bad('Reserva no encontrada.',404);
    if(rs[0].estado!=='PAGADA')throw bad('Solo se permiten cambios en reservas pagadas.',409);
    const [actual]=await db.query(`SELECT rv.vuelo_id,rv.precio,t.clase,v.aeropuerto_origen,v.aeropuerto_destino FROM reserva_vuelos rv JOIN vuelos v ON v.id=rv.vuelo_id LEFT JOIN tarifas t ON t.id=rv.tarifa_id WHERE rv.reserva_id=? AND rv.tipo_trayecto=?`,[rs[0].id,tipo]);
    if(!actual.length)throw bad('Trayecto no encontrado.',404);
    const [nuevo]=await db.query(`SELECT v.id,v.estado,v.salida,t.precio,t.cupos_disponibles FROM vuelos v JOIN tarifas t ON t.vuelo_id=v.id WHERE v.id=? AND v.aeropuerto_origen=? AND v.aeropuerto_destino=? AND t.clase=?`,[nuevoId,actual[0].aeropuerto_origen,actual[0].aeropuerto_destino,actual[0].clase]);
    if(!nuevo.length||nuevo[0].estado!=='PROGRAMADO'||new Date(nuevo[0].salida)<=new Date()||nuevo[0].cupos_disponibles<1)throw bad('El nuevo vuelo no está disponible.');
    if(nuevoId===actual[0].vuelo_id)throw bad('El vuelo es el mismo que ya tienes.');
    const diferencia=Number(nuevo[0].precio)-Number(actual[0].precio);
    await db.query(`INSERT INTO cambios (reserva_id,vuelo_anterior,vuelo_nuevo,diferencia,estado) VALUES (?,?,?,?,?)`,[rs[0].id,actual[0].vuelo_id,nuevoId,diferencia,diferencia>0?'PENDIENTE_PAGO':'PENDIENTE']);
    await db.query('INSERT INTO auditoria (accion,descripcion,direccion_ip) VALUES (?,?,?)',['CAMBIO SOLICITADO',codigo,req.ip]);
    await db.commit();res.json({mensaje:'Solicitud de cambio guardada en MySQL. El itinerario no cambia hasta su aprobación.',estado:diferencia>0?'PENDIENTE_PAGO':'PENDIENTE',diferencia});
  }catch(e){if(db)await db.rollback().catch(()=>{});console.error(e);res.status(e.status||500).json({mensaje:e.status?e.message:'Error solicitando cambio.'});}finally{if(db)db.release();}
};
