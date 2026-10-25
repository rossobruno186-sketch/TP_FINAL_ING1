//*------------------------------------------------------------------------------*
//* listTicketGET
//* API para listar ticket en base de datos para un dado cliente
//*
//* Dr. Pedro E. Colla
//* UADER - FCyT - IngenierĂ­a de Software I
//* (c) 2023,2025 Dr. Pedro E. Colla
//*-----------------------------------------------------------------------------*
//*---- Importa librerias

import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import {marshall,unmarshall}  from "@aws-sdk/util-dynamodb";

//*---- Crea cliente DynamoDB (no es tipo DynamoDBClient)

const ddbClient = new DynamoDBClient(new DynamoDBClient({}))

export const handler = async (event) => {


//*---- Arma clave de bĂşsqueda
    
const scanKey=event.queryStringParameters.ID;
const input = { // ScanInput
        TableName: "ticket",
        Select: "ALL_ATTRIBUTES" || "ALL_PROJECTED_ATTRIBUTES" || "SPECIFIC_ATTRIBUTES" || "COUNT",
        ScanFilter: {
                 'clienteID': {
                              ComparisonOperator: 'EQ' , 
                              AttributeValueList: [
                              {
                                 S : scanKey,
                              },
                              ]
                            }
                    },
        };
   
    //*---- Realiza la busqueda
    
    const command = new ScanCommand(input);
    const response = await ddbClient.send(command);
    
    //*---- Hace el unmarshalling de los datos pues NO es un objeto DynamoDBDocumentClient y por lo tanto el resultado es un JSON que 
    
    const data=response.Items.map(i=>unmarshall(i));
    
    //*---- Si anda bien retorna
    
return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({"clienteID": scanKey,
                              data
        })
        
}}

