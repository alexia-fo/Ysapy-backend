
const express = require('express');
const cors = require('cors');



    class Server {
        constructor(){
            this.app  = express();
            this.port = process.env.PORT;
            this.usuarioPath = '/api/usuarios';


        // Midelwares
            this.middlewares();

        //Rutas
             this.routes();

        }

        middlewares(){

            
            // cors
            this.app.use( cors() );

            // Lectura y Parseo de datos
            this.app.use( express.json() );

            //Directorio publico
            this.app.use( express.static('public'))
        }


        routes(){
            this.app.use( this.usuarioPath , require('../routes/usuarios'));
        }

        listen(){
            this.app.listen(this.port , ()=>{
                console.log('Servidor Corriendo en el puerto: ', this.port );
            });
        }



    }


    module.exports = Server;