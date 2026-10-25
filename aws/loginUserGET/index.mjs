//*------------------------------------------------------------------------------*
//* loginUserGET
//* API para acceder a un cliente y chequear su clave
//*
//* Dr. Pedro E. Colla
//* UADER - FCyT - IngenierÃ­a de Software I
//* (c) 2023,2025 Dr. Pedro E. Colla
//*-----------------------------------------------------------------------------*

//*----- Definición de recursos para acceder a DynamoDB
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import {marshall,unmarshall}  from "@aws-sdk/util-dynamodb";
const ddbClient = new DynamoDBClient(new DynamoDBClient({}))

//*------ Entry point Lambda function

export const handler = async (event) => {

//*------ Recupera argumentos GET

const ID= event.queryStringParameters.ID;
const PASS=event.queryStringParameters.PASSWORD; 

//*------ Arma clave de acceso a tabla cliente
var input = {
  Key: { "id" : {"S" : ID}},
  TableName : "cliente"
};

//*------ Realiza acceso a tabla cliente por ID

const command = new GetItemCommand(input);
const response = await ddbClient.send(command);
const uresponse = unmarshall(response.Item);

//*---- Si la password no coincide 

if (uresponse.password != PASS) {         
   return {
       statusCode: 400,
        body: JSON.stringify({ "response" : "invalid" }),
  };
}

//*---- Si el cliente no está activo

if (uresponse.activo != true) {
  return {
       statusCode: 401,
        body: JSON.stringify({ "response" : "invalid" }),
  };
}

//*--- Si es el primer ingreso (fuerza cambio de password)

if (uresponse.primer_ingreso == true) {
  return {
       statusCode: 402,
        body: JSON.stringify({ "response" : "cambio password" }),
  };
}    

//*----- si la validaciÃ³n ha sido buena debe actualizar la fecha de Ãºltimo ingreso
//*--- Obtiene fecha corriente y puebla campos relacionados
    	    
var hoy = new Date();
var dd = String(hoy.getDate()).padStart(2, '0');
var mm = String(hoy.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = hoy.getFullYear();
hoy = dd + '/' + mm + '/' + yyyy;

//*---- Arma clave de bÃºsqueda

const u = { 
  ExpressionAttributeNames: { 
       "#f": "fecha_ultimo_ingreso"
  }, 
  ExpressionAttributeValues: { 
      ":f": { 
         S: hoy,
      }, 
 }, 
 Key: { 
     "id": { 
         S: ID 
 }}, 
 ReturnValues: "ALL_NEW", 
 TableName: "cliente", 
 UpdateExpression: "SET #f = :f " 
};

//*---- Realiza la busqueda y actualizaciÃ³n           
const c = new UpdateItemCommand(u);
const resp = await ddbClient.send(c);

//*---- Hace el unmarshalling de los datos pues NO es un objeto DynamoDBDocumentClient y por lo tanto el resultado es un JSON que
const uresp=unmarshall(resp.Attributes);

//*---- Prepara respuesta final

return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body : JSON.stringify({"response":"OK",
      "nombre": uresponse.nombre,
      "contacto": uresponse.contacto,
      "password": uresponse.password,
      "fecha_ultimo_ingreso": uresponse.fecha_ultimo_ingreso,
      "activo": uresponse.activo,
      "fecha_cambio_password": uresponse.fecha_cambio_password,
      "registrado": uresponse.registrado,
      "primer_ingreso": uresponse.primer_ingreso,
      "fecha_alta": uresponse.fecha_alta,
      "id": uresponse.id}),
      
}};                                               
