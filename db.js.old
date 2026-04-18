const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Función para conectar (o crear si no existe) la DB
async function initDB() {
    const db = await open({
        filename: './entradas.db', // El archivo se creará aquí
        driver: sqlite3.Database
    });

    // Creamos la tabla si no existe
    await db.exec(`
        CREATE TABLE IF NOT EXISTS entradas (
            id INTEGER PRIMARY KEY,
            email TEXT,
            nome TEXT,
            estado TEXT DEFAULT 'valido'
        )` 
    );

    console.log("Base de datos conectada y lista.");
    return db;
}

module.exports = initDB;