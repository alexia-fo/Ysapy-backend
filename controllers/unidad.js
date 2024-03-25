//!ADMINISTRACION

const { response } = require("express");
const Unidad = require("../model/unidad");

//FIXME: para obtener el listado de unidades para el combo en abmc de productos
const unidadesGet = async (req = request, res = response) => {
    let limite = req.query.limite;
    let desde = req.query.desde;

    try {
        if (!limite && !desde) {
            const [total, unidad] = await Promise.all([
                Unidad.count(),
                Unidad.findAll(),
            ]);

            res.json({
                total,
                unidad,
            });
        } else if (limite !== undefined && desde !== undefined) {
            limite = parseInt(limite);
            desde = parseInt(desde);

            if (limite <= desde) {
                return res.status(404).json({ error: "El valor de 'limite' debe ser mayor que el valor de 'desde'" });
            }

            const [total, unidad] = await Promise.all([
                Unidad.count(),
                Unidad.findAll({
                    offset: desde,
                    limit: limite,
                }),
            ]);

            res.json({
                total,
                unidad,
            });
        } else {
            return res.status(404).json({ error: "Si se proporciona uno de los parámetros 'limite' y 'desde', ambos deben ser proporcionados" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Error al obtener las unidades" });
    }
};

module.exports = {
    unidadesGet,
}