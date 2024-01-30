
const express = require('express');
const cors = require('cors');
const fileUpload =require('express-fileupload');
const db = require('../db/conections');

//!
const path =require('path');


const { check } = require('express-validator');

    class Server {
        constructor(){
            this.app  = express();
            this.port = process.env.PORT || 3000;

            this.paths = {
                auth:           '/api/auth',
                clasificaciones:'/api/clasificaciones',
                informaciones:'/api/informaciones',
                inventarios:     '/api/inventarios',
                productos:      '/api/productos',
                recepciones:'/api/recepciones',
                salidas:'/api/salidas',
                roles:     '/api/roles',
                sucursales:     '/api/sucursales',
                usuarios:       '/api/usuarios',
                uploads:        '/api/uploads',
                calculosRendicion:        '/api/inventariosRegistrados',
                informesAdmin:        '/api/informesAdmin',
                pedidosFuncionarios:        '/api/pedidosFuncionarios',
                recursosAdmin:        '/api/recursosAdmin',
            }

            // this.usuarioPath = '/api/usuarios';
            // this.authPath = '/api/auth';


        // Base de datos
            this.dbConnection();
        // Midelwares
            this.middlewares();

            //-----------------TEMPORAL-----------
               //Evitar el error de url al buscar el index.html al desplegar en produccion
               //Manejar las demas rutas
    
            //    this.app.get('*', (req, res)=>{
            //        res.sendFile(path.resolve(__dirname, '../public/index.html'));
            //    })

            // Sirve 'index.html' para todas las rutas excepto las de recursos estáticos
/*
    En resumen, este código se utiliza para servir un archivo HTML específico (en este caso, 
    "index.html") cuando la URL solicitada no comienza con "/api/". Es comúnmente utilizado 
    en aplicaciones de una sola página (SPA) para enrutar todas las solicitudes a la página 
    principal de la aplicación, lo que permite que el enrutamiento del lado del cliente (por 
    ejemplo, en Angular o React) maneje las rutas.
*/
this.app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Sirve archivos estáticos desde la carpeta 'public'
this.app.use(express.static(path.join(__dirname, '../public')));


           //-----------------FIN TEMPORAL-----------

        //Rutas
             this.routes();

        }

        async dbConnection(){
            try {
                await db.authenticate();
                console.log('Base de Datos ON LINE');
            } catch (error) {
                throw new Error(error);
            }
        }

        middlewares(){

            //! cors
            /*
            Básicamente, permite que el servidor responda a solicitudes realizadas desde un 
            dominio o puerto diferente al que sirve la aplicación, lo que es fundamental para 
            permitir que aplicaciones web accedan a recursos en otros servidores.
            */
            // this.app.use( cors() );//deshabilitamos para que no se pueda realizar peticiones desde otros origenes


            // Lectura y Parseo de datos
            this.app.use( express.json() );

            //Directorio publico
            //!
            // this.app.use( express.static('public'));

            this.app.use(express.static(path.join(__dirname, '../public')))

            // this.app.use(express.static('../public'))


            // Fileupload - carga de archivo
            this.app.use(fileUpload({
                useTempFiles : true,
                tempFileDir : '/tmp/',
                createParentPath: true,
            }));

        }

        routes(){
            this.app.use( this.paths.auth , require('../routes/auth'));
            this.app.use( this.paths.clasificaciones, require('../routes/clasificaciones'));
            this.app.use( this.paths.informaciones , require('../routes/informaciones'));
            this.app.use( this.paths.inventarios , require('../routes/inventarios'));
            this.app.use( this.paths.productos, require('../routes/productos'));
            this.app.use( this.paths.recepciones, require('../routes/recepciones'));
            this.app.use( this.paths.salidas, require('../routes/salidaProductos'));
            this.app.use( this.paths.roles , require('../routes/roles'));
            this.app.use( this.paths.sucursales , require('../routes/sucursales'));
            this.app.use( this.paths.uploads , require('../routes/uploads'));
            this.app.use( this.paths.usuarios , require('../routes/usuarios'));
            this.app.use( this.paths.calculosRendicion , require('../routes/inventariosRegistrados'));
            this.app.use( this.paths.informesAdmin , require('../routes/informes-admin'));
            this.app.use( this.paths.recursosAdmin , require('../routes/recursosAdmin'));
            this.app.use( this.paths.pedidosFuncionarios , require('../routes/pedidos-funcionarios/index'));
            
        }

        listen(){
            this.app.listen(this.port , ()=>{
                console.log('Servidor Corriendo en el puerto: ', this.port );
            });
        }

    }


    module.exports = Server;