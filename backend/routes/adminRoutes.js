
const express = require("express");
const router = express.Router();

const verificarToken = require("../middlewares/verificarToken");
const verificarRol = require("../middlewares/verificarRol");
const adminController = require("../controllers/adminController");

router.use(verificarToken);
router.use(verificarRol("Administrador"));

router.get("/usuarios", adminController.listarUsuarios);
router.post("/usuarios", adminController.crearUsuario);
router.patch("/usuarios/:id/rol", adminController.cambiarRol);
router.patch("/usuarios/:id/estado", adminController.cambiarEstado);
router.patch("/usuarios/:id/desbloquear", adminController.desbloquear);
router.get("/auditoria", adminController.listarAuditoria);

module.exports = router;
