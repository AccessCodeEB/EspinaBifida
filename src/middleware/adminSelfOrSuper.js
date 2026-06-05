/**
 * Permite la acción solo si el admin autenticado es el mismo :idAdmin o es rol 1 (Administrador).
 */
export function adminSelfOrSuper(req, res, next) {
  const idParam = Number(req.params.idAdmin);
  if (Number.isNaN(idParam)) {
    return res.status(400).json({ message: "idAdmin inválido" });
  }
  if (req.user.idAdmin === idParam) return next();
  if (req.user.idRol === 1) return next();
  return res.status(403).json({ message: "No autorizado para modificar este perfil" });
}
