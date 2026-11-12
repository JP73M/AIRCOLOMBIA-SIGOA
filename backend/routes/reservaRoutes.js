const router=require('express').Router();
const c=require('../controllers/reservaController');
router.post('/',c.crear);
router.get('/reportes',c.reportes); // Demo local: proteger con JWT/rol antes de desplegar
router.get('/:codigo',c.consultar);
router.post('/:codigo/cancelacion',c.cancelar);
router.post('/:codigo/cambio',c.solicitarCambio);
module.exports=router;
