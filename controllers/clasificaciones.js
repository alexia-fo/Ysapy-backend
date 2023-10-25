//!ADMINISTRACION

const { response } = require("express");
const {Clasificacion} = require('../model');

const clasificacionesGet = async (req = request, res = response) => {
    let limite = req.query.limite;
    let desde = req.query.desde;

    try {
        if (!limite && !desde) {
            const [total, clasificacion] = await Promise.all([
                Clasificacion.count(),
                Clasificacion.findAll(),
            ]);

            res.json({
                total,
                clasificacion,
            });
        } else if (limite !== undefined && desde !== undefined) {
            limite = parseInt(limite);
            desde = parseInt(desde);

            if (limite <= desde) {
                return res.status(404).json({ error: "El valor de 'limite' debe ser mayor que el valor de 'desde'" });
            }

            const [total, clasificacion] = await Promise.all([
                Clasificacion.count(),
                Clasificacion.findAll({
                    offset: desde,
                    limit: limite,
                }),
            ]);

            res.json({
                total,
                clasificacion,
            });
        } else {
            return res.status(404).json({ error: "Si se proporciona uno de los parámetros 'limite' y 'desde', ambos deben ser proporcionados" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Error al obtener las clasificaciones" });
    }
};

module.exports = {
    clasificacionesGet,
}