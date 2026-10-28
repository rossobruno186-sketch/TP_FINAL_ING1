
/*-----------------------------------------------------------------------------------------------------------------
  MesaAyuda.js debe copiarse al directorio del proyecto express como index.js

  REST API 
  UADER - IS1
  Caso de estudio MesaAyuda

  Dr. Pedro E. Colla 2023,2025
 *----------------------------------------------------------------------------------------------------------------*/
//AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE=1

import express from 'express';
import crypto from 'crypto';
console.log("Comenzando servidor");

// const crypto = require('crypto');
console.log("crypto Ok!");

//const express = require('express');
//console.log("express Ok!");

const app = express();
console.log("express ready!");

const PORT = 8080;

import cors from 'cors';

//const cors = require('cors');
console.log("cors ok!");

app.use(cors());
console.log("cors ready!");

import AWS from 'aws-sdk'
//var AWS = require('aws-sdk');
console.log("aws-sdk ready!");

/*----
Acquire critical security resources from an external file out of the path
*/
//const accessKeyId = require('../accessKeyId.js');
//const secretAccessKey = require('../secretAccessKey.js');
import accessKeyId from './accessKeyId.js';
import secretAccessKey  from './secretAccessKey.js';

let awsConfig = {
    "region"         : "us-east-1",
    "endpoint"       : "http://dynamodb.us-east-1.amazonaws.com",
    "accessKeyId"    : accessKeyId, 
    "secretAccessKey": secretAccessKey
};

AWS.config.update(awsConfig);
console.log("Servidor listo!");
let docClient = new AWS.DynamoDB.DocumentClient();

app.listen(
    PORT,
    () => console.log(`Servidor listo en http://localhost:${PORT}`)
);

app.use(express.json());

app.get('/api/cliente', (req,res) => {
    res.status(200).send({response : "OK", message : "API Ready"});
    console.log("API cliente: OK");
});

/*-----------
función para hacer el parse de un archivo JSON
*/
function jsonParser(keyValue,stringValue) {
    var string = JSON.stringify(stringValue);
    var objectValue = JSON.parse(string);
    return objectValue[keyValue];
}
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
/*                                                       API REST Cliente                                                            *
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*


/*-----------
  /api/getCliente
  Esta API permite acceder a un cliente dado su id
*/
app.post('/api/getCliente/:id', (req,res) => {
    const { id } = req.params;
    console.log("getCliente: id("+id+")");
    var params = {
        TableName: "cliente",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
        } else {

            if (Object.keys(data).length != 0) {
               res.status(200).send(JSON.stringify({"response":"OK","cliente" : data.Item}),null,2);
            } else {
               res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
            }
        }    
    })


} );

/*---
  /api/loginCliente
  Esta API permite acceder a un cliente por contacto y comparar la password pasada en un JSON en el cuerpo con la indicada en el DB
*/  
app.post('/api/loginCliente', (req,res) => {

    const { contacto } = req.body;
    const { password } = req.body;

    console.log("loginCliente: contacto("+contacto+") password ("+password+")");

    if (!password) {
        res.status(400).send({response : "ERROR" , message : "Password no informada"});
        return;
    }    
    if (!contacto) {
        res.status(400).send({response : "ERROR" , message : "Contacto no informado"});
        return;
    }    

    scanDb(contacto)
    .then(resultDb => {
        if (resultDb.length == 0) {
            res.status(400).send({response : "ERROR" , message : "Cliente invalido"});
        } else {
            const cliente = resultDb[0];
            if (password == cliente.password) {
                if (cliente.activo == true) {
                    // 1. Calcular la fecha actual (DD/MM/YYYY)
                    const hoy = new Date();
                    const dd = String(hoy.getDate()).padStart(2, '0');
                    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
                    const yyyy = hoy.getFullYear();
                    const fechaActual = `${dd}/${mm}/${yyyy}`;
                    // 2. Parámetros para actualizar en DynamoDB
                    const paramsUpdate = {
                        TableName: "cliente",
                        Key: { "id": cliente.id },
                        UpdateExpression: "SET #f = :f",
                        ExpressionAttributeNames: { "#f": "fecha_ultimo_ingreso" },
                        ExpressionAttributeValues: { ":f": fechaActual },
                        ReturnValues: "ALL_NEW"
                    };
                    // 3. Ejecutar la actualización en la BD y responder
                    docClient.update(paramsUpdate, function (err, data) {
                        if (err) {
                            console.log("Error al actualizar fecha_ultimo_ingreso: " + err);
                        }
                        res.status(200).send(JSON.stringify({
                            response : "OK", 
                            "id" : cliente.id, 
                            "nombre" : cliente.nombre, 
                            "contacto" : cliente.contacto, 
                            "fecha_ultimo_ingreso": fechaActual
                        }));
                    });
                } else {
                    res.status(400).send(JSON.stringify({response : "ERROR", message : "Cliente no activo"}));    
                }
            } else {
                res.status(400).send(JSON.stringify({response : "ERROR" , message : "usuario incorrecto"}));
            }   
        }
    })
    .catch(err => {
        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error " + err}));
    });
});

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/
async function scanDb(contacto) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const scanKey=contacto;
   const paramsScan = { // ScanInput
    TableName: "cliente", // required
    Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
    FilterExpression : 'contacto = :contacto',
    ExpressionAttributeValues : {':contacto' : scanKey}
};
    var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
          return data.Items 
    });  
    return objectPromise;
}

/*----
  /api/addCliente
  Esta API permite registrar un nuevo cliente en la base de datos
*/
app.post('/api/addCliente', (req, res) => {
    const { nombre, contacto, password } = req.body;

    if (!nombre || !contacto || !password) {
        res.status(400).send({response: "ERROR", message: "Faltan datos obligatorios"});
        return;
    }

    // Generar ID único numérico y fecha actual
    const nuevoId = Date.now().toString(); 
    const fechaActual = new Date().toISOString().split('T')[0];

    const params = {
        TableName: "cliente",
        Item: {
            "id": nuevoId,
            "nombre": nombre,
            "contacto": contacto,
            "password": password,
            "activo": true,
            "fecha_ultimo_ingreso": fechaActual
        }
    };

    docClient.put(params, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({response: "ERROR", message: "Error guardando en DB: " + err}));
        } else {
            res.status(200).send(JSON.stringify({response: "OK", message: "Usuario registrado"}));
        }
    });
});
/*----------
/api/updateCliente
Permite actualizar datos del cliente contacto, nombre, estado de activo y registrado
*/
app.post('/api/updateCliente', (req,res) => {
    
    const {id} = req.body;
    const {nombre}   = req.body; 
    const {password} = req.body;

    var activo = ((req.body.activo+'').toLowerCase() === 'true')
    var registrado = ((req.body.registrado+'').toLowerCase() === 'true')

    console.log("updateCliente: id("+id+") nombre("+nombre+") password("+password+") activo("+activo+") registrado("+registrado+")");

    if (!id) {
        res.status(400).send({response : "ERROR" , message: "Id no informada"});
        return;
    }

    if (!nombre) {
        res.status(400).send({response : "ERROR" , message: "Nombre no informado"});
        return;
    }

    if (!password) {
        res.status(400).send({response : "ERROR" , message: "Password no informado"});
        return;
    }

    var params = {
        TableName: "cliente",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
        
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
                return;
            } else {

                const paramsUpdate = { 
   
                    ExpressionAttributeNames: { 
                         "#a": "activo", 
                         "#n": "nombre",
                         "#p": "password",
                         "#r": "registrado"

                    }, 
                    ExpressionAttributeValues: { 
                        ":a": activo , 
                        ":p": password,
                        ":n": nombre , 
                        ":r": registrado 
                   }, 
                   Key: { 
                       "id": id 
                   }, 
                   ReturnValues: "ALL_NEW", 
                   TableName: "cliente", 
                   UpdateExpression: "SET #n = :n, #p = :p, #a = :a, #r = :r" 
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err)  {
                        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({response : "OK", message : "updated" , "data": data}));
                    }    
                });    
            }
        }    
    })


});
/*-------
/api/resetCliente
Permite cambiar la password de un cliente
*/
app.post('/api/resetCliente', (req,res) => {
    
    const {id}       = req.body;
    const {password} = req.body;
 
    if (!id) {
        res.status(400).send({response : "ERROR" , message: "Id no informada"});
        return;
    }

    if (!password) {
        res.status(400).send({response : "ERROR" , message: "Password no informada"});
        return;
    }

    var params = {
        TableName: "cliente",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
        
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({"response":"ERROR",message : "Cliente no existe"}),null,2);
                return;
            } else {

                const paramsUpdate = { 
   
                    ExpressionAttributeNames: { 
                         "#p": "password" 
                    }, 
                    ExpressionAttributeValues: { 
                        ":p": password 
                   }, 
                   Key: { 
                       "id": id 
                   }, 
                   ReturnValues: "ALL_NEW", 
                   TableName: "cliente", 
                   UpdateExpression: "SET #p = :p" 
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err)  {
                        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({response : "OK", message : "updated" , "data": data}));
                    }    
                });    
            }
        }    
    })
});
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*
/*                                                       API REST ticket                                                             *
/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

/*---------
Función para realizar el SCAN de un DB de cliente usando contacto como clave para la búsqueda (no es clave formal del DB)
*/
async function scanDbTicket(clienteID) {
    var docClient = new AWS.DynamoDB.DocumentClient();
    const scanKey=clienteID;
    const paramsScan = { // ScanInput
      TableName: "ticket", // required
      Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
      FilterExpression : 'clienteID = :clienteID',
      ExpressionAttributeValues : {':clienteID' : scanKey}
    };      
    var objectPromise = await docClient.scan(paramsScan).promise().then((data) => {
          return data.Items 
    });  
    return objectPromise;
}
/*----------
  listarTicket
  API REST para obtener todos los tickets de un clienteID
*/  
app.post('/api/listarTicket', (req,res) => {

    const {clienteID}  = req.body;
    console.log("listarTicket: clienteID("+clienteID+")");
 
    if (!clienteID) {
        res.status(400).send({response : "ERROR" , message: "clienteID no informada"});
        return;
    }

    scanDbTicket(clienteID)
    .then(resultDb => {
      if (Object.keys(resultDb).length == 0) {
        res.status(400).send({response : "ERROR" , message : "clienteID no tiene tickets"});
        return;
      } else {
        res.status(200).send(JSON.stringify({response : "OK",  "data": resultDb}));
    }

    });

});

/*---------
  /api/getTicket (Modificado para Punto 7)
  API REST para obtener el detalle de un ticket validando credenciales (GET y POST)
*/
const getTicketHandler = (req, res) => {
    // 1. Soportar GET (URL) y POST (JSON)
    const body = req.body || {};
    const query = req.query || {};
    const contacto = body.contacto || query.contacto;
    const password = body.password || query.password;
    const id = body.id || query.id; // Este es el ID del ticket a buscar

    console.log("getTicket: contacto(" + contacto + ") password(" + password + ") ticketID(" + id + ")");
 
    if (!contacto || !password || !id) {
        res.status(400).send(JSON.stringify({response : "ERROR" , message: "Faltan datos (contacto, password o id del ticket)"}));
        return;
    }

    // 2. Validar que el cliente exista y la contraseña sea correcta
    scanDb(contacto)
    .then(resultDbCliente => {
        
        if (resultDbCliente.length == 0) {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "Cliente no existe"}));
            return;
        }

        const cliente = resultDbCliente[0];
        
        if (password !== cliente.password) {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "Contraseña incorrecta"}));
            return;
        }

        // 3. Si la clave está bien, buscamos el ticket específico
        var params = {
            TableName: "ticket",
            Key: { "id" : id }
        };
        
        docClient.get(params, function (err, data) {
            if (err) {
                res.status(400).send(JSON.stringify({response : "ERROR", message : "Error de acceso a la BD"}));
            }
            else {
                if (Object.keys(data).length == 0) {
                    res.status(400).send(JSON.stringify({response : "ERROR" , message : "El ticket no existe"}));
                } else {
                    // Chequeo extra de seguridad: verificar que el ticket sea de este cliente
                    if (data.Item.clienteID !== cliente.id) {
                        res.status(400).send(JSON.stringify({response : "ERROR", message : "Este ticket no pertenece a su cuenta"}));
                        return;
                    }
                    res.status(200).send(JSON.stringify({response : "OK", "data" : data.Item}));    
                }    
            }
        });
    })
    .catch(err => {
        res.status(400).send(JSON.stringify({response : "ERROR", message : "Error al procesar la solicitud"}));
    });
};

// Asignamos la función para que soporte los métodos GET y POST
app.get('/api/getTicket', getTicketHandler);
app.post('/api/getTicket', getTicketHandler);

/*-----------------
/api/addTicket
API REST para agregar ticket (genera id)
*/
app.post('/api/addTicket', (req,res) => {

    const {clienteID} = req.body;
    const estado_solucion = 1;
    const {solucion} = req.body;
    const {descripcion} = req.body;

    var hoy = new Date();
    var dd = String(hoy.getDate()).padStart(2, '0');
    var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = hoy.getFullYear();
    hoy = dd + '/' + mm + '/' + yyyy;

    const newTicket = {
     id                    : crypto.randomUUID(),
     clienteID             : clienteID,
     estado_solucion       : estado_solucion,
     solucion              : solucion,
     descripcion           : descripcion,
     fecha_apertura        : hoy,
     ultimo_contacto       : hoy
    };

    const paramsPut = {
      TableName: "ticket",
      Item: newTicket,
      ConditionExpression:'attribute_not_exists(id)',
    };

    docClient.put(paramsPut, function (err, data) {
        if (err) {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB error" + err}));
        } else {
            res.status(200).send(JSON.stringify({response : "OK", "ticket": newTicket}));
        }
    });
}
)

/*--------
/api/updateTicket
Dado un id actualiza el ticket, debe informarse la totalidad del ticket excepto ultimo_contacto
*/
app.post('/api/updateTicket', (req,res) => {

    const {id} = req.body;
    const {clienteID} = req.body;
    const {estado_solucion} = req.body;
    const {solucion} = req.body;
    const {descripcion} = req.body;
    const {fecha_apertura} = req.body;

    if (!id) {
        res.status(400).send({response : "ERROR" , message: "Id no informada"});
        return;
    }

    if (!clienteID) {
        res.status(400).send({response : "ERROR" , message: "clienteID no informada"});
        return;
    }

    if (!estado_solucion) {
        res.status(400).send({response : "ERROR" , message: "estado_solucion no informada"});
        return;
    }

    if (!solucion) {
        res.status(400).send({response : "ERROR" , message: "solucion no informado"});
        return;
    }

    if (!fecha_apertura) {
        res.status(400).send({response : "ERROR" , message: "fecha apertura"});
        return;
    }
    
    var hoy = new Date();
    var dd = String(hoy.getDate()).padStart(2, '0');
    var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = hoy.getFullYear();
    hoy = dd + '/' + mm + '/' + yyyy;

    const ultimo_contacto = hoy;

    var params = {
        TableName: "ticket",
        Key: {
            "id" : id
            //test use "id": "0533a95d-7eef-4c6b-b753-1a41c9d1fbd0"   
             }
        };
        
    docClient.get(params, function (err, data) {
        if (err)  {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+ null}));
            return;
        } else {

            if (Object.keys(data).length == 0) {
                res.status(400).send(JSON.stringify({"response":"ERROR",message : "ticket no existe"}),null,2);
                return;
            } else {

                const paramsUpdate = { 
   
                    ExpressionAttributeNames: { 
                         "#c": "clienteID", 
                         "#e": "estado_solucion",
                         "#s": "solucion",
                         "#a": "fecha_apertura",
                         "#u": "ultimo_contacto",
                         "#d": "descripcion"
                    }, 
                    ExpressionAttributeValues: { 
                        ":c":  clienteID, 
                        ":e":  estado_solucion , 
                        ":s":  solucion , 
                        ":a":  fecha_apertura,
                        ":u":  ultimo_contacto,
                        ":d":  descripcion 
                   }, 
                   Key: { 
                       "id": id 
                   }, 
                   ReturnValues: "ALL_NEW", 
                   TableName: "ticket", 
                   UpdateExpression: "SET #c = :c, #e = :e, #a = :a, #s = :s, #d = :d, #u = :u" 
                };
                docClient.update(paramsUpdate, function (err, data) {
                    if (err)  {
                        res.status(400).send(JSON.stringify({response : "ERROR", message : "DB access error "+err}));
                        return;
                    } else {
                        res.status(200).send(JSON.stringify({response : "OK",  "data": data}));
                    }    
                });    
            }
        }    
    })

});
/*-------------------------------------------------[ Fin del API REST ]-------------------------------------------------------------*/

/*-----------------
/api/resumenTickets
API REST para obtener resumen de tickets validando usuario y contraseña (GET y POST)
-----------------*/
const resumenTicketsHandler = (req, res) => {
    // 1. Soportar GET (URL) y POST (JSON) a prueba de errores
    const body = req.body || {};
    const query = req.query || {};
    const contacto = body.contacto || query.contacto;
    const password = body.password || query.password;

    console.log("resumenTickets: contacto(" + contacto + ") password(" + password + ")");

    if (!contacto || !password) {
        res.status(400).send(JSON.stringify({response : "ERROR", message : "Faltan credenciales (contacto o password)"}));
        return;
    }

    // 2. Validar que el cliente exista usando la misma búsqueda del login
    scanDb(contacto)
    .then(resultDbCliente => {
        
        if (resultDbCliente.length == 0) {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "Cliente no existe"}));
            return;
        }

        const cliente = resultDbCliente[0]; // Tomamos los datos del cliente encontrado
        
        if (password !== cliente.password) {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "Contraseña incorrecta"}));
            return;
        }

        // 3. Si la clave está bien, buscamos los tickets vinculados a su ID numérico
        scanDbTicket(cliente.id)
        .then(resultDbTickets => {
            
            res.status(200).send(JSON.stringify({
                response: "OK",
                cantidad_tickets: resultDbTickets.length,
                detalle_tickets: resultDbTickets
            }));
            
        }).catch(err => {
            res.status(400).send(JSON.stringify({response : "ERROR", message : "Error al buscar los tickets"}));
        });
        
    })
    .catch(err => {
        res.status(400).send(JSON.stringify({response : "ERROR", message : "Error de acceso a la BD"}));
    });
};

// Asignamos la misma función para que soporte los métodos GET y POST
app.get('/api/resumenTickets', resumenTicketsHandler);
app.post('/api/resumenTickets', resumenTicketsHandler);