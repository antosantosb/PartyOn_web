const express = require('express');
const QRCode = require('qrcode');
const sharp = require('sharp');
const app = express();
const nodemailer = require('nodemailer');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

const initDB = require('./db');
let db; 

// Iniciamos la DB al arrancar el servidor
initDB().then(database => {
    db = database;
});

// Ruta para comprar una entrada
app.post('/comprar', async (req, res) => {
     const idsUnicos = [];//array para múltiples entradas.        
    try {
        const nombreUsuario = req.body.usuario_nombre || "Cliente Ejemplo";
        const emailUsuario = req.body.usuario_email || "ejemplo@gmail.com";
        const cantidadEntradas = parseInt(req.body.cantidad_entradas) || 1;
        const arquivosAdjuntos = [];//array para múltiples entradas.

        // Loop para generar múltiples entradas, dependiendo de la cantidad solicitada
        for(let i = 0; i < cantidadEntradas; i++) {
        // Generamos un ID único para el ticket
        const randomNum = Math.floor(Math.random() * 1000);
        const idUnico = (Date.now()*1000) + randomNum;
        idsUnicos.push(idUnico);
        // 1. Generación del código QR en memoria
        const myIP = '192.168.1.218';//cambiar por tu IP local o dominio
        const qrData = `http://${myIP}:3000/validar?id=${idUnico}`;
        const bufferQR = await QRCode.toBuffer(qrData, {
            color: { dark: '#000000', light: '#FFFFFF' },
            width: 300
        });
        const imagenFinalBuffer = [];//array para múltiples entradas.
        // 2. Composición de imagen usando Sharp
        imagenFinalBuffer[i] = await sharp('base.jpg')
            .composite([
                { input: bufferQR, top: 130, left: 450 }
            ]).toFormat('png').toBuffer();
        console.log("Entrada generada para: " + idUnico);

        if (db) {
            await db.run(
                'INSERT INTO entradas (id, email, nome, estado) VALUES (?, ?, ?, ?)',
                [idUnico, emailUsuario, nombreUsuario, 'valido']
            );
            console.log("Entrada guardada en base de datos SQLite");//Probablemente sea necesario cambiar de SQlite a otro motor de BD más robusto para producción.
        }

        const arquivo = {
            filename: `entrada_${i}.png`,
            content: imagenFinalBuffer[i],
            contentType: 'image/png'
        };
        arquivosAdjuntos.push(arquivo);
    }// Fin del loop de entradas

        // 4. Configuración de Nodemailer para enviar el correo
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
            tls: { 
                rejectUnauthorized: false 
            }
        });

        

        const info = await transporter.sendMail({
            from: '"Eventos ON" <partyon@jade.com>',
            to: 'cliente@ejemplo.com',
            subject: 'Tus entradas para el evento',
            text: 'Adjunta encontrarás tu entrada con el código QR.',
            attachments: arquivosAdjuntos
        });

        console.log('Correo enviado: %s', info.messageId);
        console.log('Vista previa del correo: %s', nodemailer.getTestMessageUrl(info));

        /*const imagenBase64 = imagenFinalBuffer.toString('base64');
        const srcImagen = `data:image/png;base64,${imagenBase64}`;
         <div style="margin: 20px 0; border: 2px solid rgba(255,255,255,0.2); border-radius: 10px; overflow: hidden;">
                        <img src="${srcImagen}" style="width: 100%; display: block;" alt="Tu Entrada">
                    </div>
        */
        const linkEmail = nodemailer.getTestMessageUrl(info);
        // Redirigimos a la página de éxito
        res.redirect('/exito?nombre=' + encodeURIComponent(nombreUsuario) + '&email=' + encodeURIComponent(emailUsuario) + '&link=' + encodeURIComponent(linkEmail));

    } catch (error) {
        console.error(error);
        // En caso de error, eliminamos las entradas creadas
        if (db && idsUnicos.length > 0) {
            for (const id of idsUnicos){
                await db.run('DELETE FROM entradas WHERE id = ?', [id]);
            }
            console.log("Entradas eliminadas de la base de datos por un error.");
        }
        res.redirect('/error');
    }
});
// Ruta de éxito después de comprar la entrada
app.get('/exito', (req, res) => {
    const nombreUsuario = req.query.nombre || "Cliente Ejemplo";
    const emailUsuario = req.query.email || "@ejemplo.com";
    const linkEmail = req.query.link || "#";
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>¡Entrada Lista!</title>
            <link rel="stylesheet" href="style.css"> </head>
        <body>
            <div class="bg-blur"></div>

            <main class="container" style="justify-content: center;">
                <div class="glass-card" style="text-align: center; width: 500px;">
                    <h1 style="font-size: 2.5rem; margin-bottom: 10px;">¡TODO LISTO!</h1>
                    <p style="color: #ccc; margin-bottom: 20px;">
                        Muchas gracias, <strong>${nombreUsuario}</strong>!.
                    </p>

                    <p style="font-size: 0.9rem; color: #aaa; margin-bottom: 20px;">
                       Tus entradas fueron enviados a este correo: <em>${emailUsuario}</em>
                    </p>

                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <a href="${linkEmail}" target="_blank" class="btn-neon" style="text-decoration: none; display: inline-block; width: auto; padding: 10px 20px; font-size: 0.9rem;">
                            VER EMAIL
                        </a>
                        <a href="/" class="btn-neon" style="text-decoration: none; background: transparent; border: 1px solid #c77dff; color: #c77dff; display: inline-block; width: auto; padding: 10px 20px; font-size: 0.9rem;">
                            VOLVER
                        </a>
                    </div>
                </div>
            </main>
        </body>
        </html>
        `)
});

app.get('/error', (req, res) => {
    res.status(500).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Algo salió mal</title>
            <link rel="stylesheet" href="style.css">
        </head>
        <body>
            <div class="bg-blur" style="background: radial-gradient(circle, #ff0055 0%, #0a0a0a 70%);"></div>

            <main class="container" style="justify-content: center;">
                <div class="glass-card" style="text-align: center; width: 500px; border: 1px solid rgba(255, 0, 85, 0.3);">
                    
                    <div style="font-size: 5rem; margin-bottom: 10px;">😵</div>

                    <h1 style="font-size: 2.5rem; margin-bottom: 10px; text-shadow: 0 0 10px rgba(255, 0, 85, 0.5);">
                        ¡Ups! Algo falló
                    </h1>

                    <p style="color: #ccc; margin-bottom: 30px; font-size: 1.1rem; line-height: 1.6;">
                        No pudimos generar tu entrada en este momento.<br>
                        No te preocupes, no se ha realizado ningún cobro.
                    </p>

                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <a href="/" class="btn-neon" style="text-decoration: none; border-color: #d4d4d4e7; color: #ffffffd2; box-shadow: 0 0 10px rgba(255, 0, 85, 0.2);">
                            VOLVER A INTENTAR
                        </a>
                    </div>
                    
                </div>
            </main>
        </body>
        </html>
        `);
});

// Ruta para validar una entrada
app.post('/validar', async (req, res) => {
    try {
        // Ahora los datos vienen en el BODY, no en la query
        const { id, secret } = req.body;

        // 1. MEDIDA DE SEGURIDAD: Comprobar la contraseña del portero
        if (secret !== "portero-secreto-123") {
            return res.json({ status: 'error', message: '⛔ No tienes permiso para validar.' });
        }

        if (!db) return res.json({ status: 'error', message: 'Base de datos no disponible' });

        const ticket = await db.get('SELECT * FROM entradas WHERE id = ?', [id]);

        if (!ticket) {
            return res.json({ status: 'error', message: '❌ ENTRADA NO ENCONTRADA' });
        }

        if (ticket.estado === 'usado') {
            return res.json({ 
                status: 'warning', 
                message: `⚠️ Entrada YA USADA por ${ticket.nome}` 
            });
        }

        // Si todo está bien, quemamos la entrada
        await db.run('UPDATE entradas SET estado = ? WHERE id = ?', ['usado', id]);

        return res.json({ status: 'success', message: '✅ Entrada Válida. ¡Adelante!' });

    } catch (error) {
        console.error(error);
        res.json({ status: 'error', message: 'Error del servidor' });
    }
});

// Iniciamos el servidor en el puerto 3000
app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});

