//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// arweave.js - 2021-10-17_01
// Code to interact with Arweave.
//


// Imports
const ArweaveLib  = require ('arweave');
const Sys         = require ('./sys.js');
const Settings    = require ('./settings.js');
const Util        = require ('./util.js');
const GQL         = require ('./GQL.js');



// Variables
var Arweave_Instance;


// Constants
const _TAG = "Arweave";






function Init ()
{
    if (Arweave_Instance == undefined)
    {
        const Config = Settings.Config;
        Sys.VERBOSE ("Connecting to " + Settings.GetHostString () + "...")

        Arweave_Instance = ArweaveLib.init
        (
            {
                host:     Config.ArweaveHost,
                port:     Config.ArweavePort,
                protocol: Config.ArweaveProto
            }
        );        
    }
    return Arweave_Instance;
}


async function Testing ()
{
    const arweave = ArweaveLib.init
    (
        {
            host:     Settings.Config.ArweaveHost,
            port:     Settings.Config.ArweavePort,
            protocol: Settings.Config.ArweaveProto
        }
    );     

}


async function DisplayArweaveInfo (args)
{
    const arweave = Init ();

    Sys.VERBOSE ("Fetching network information..");
    Sys.OUT_TXT (await arweave.network.getInfo () );

}





async function SearchTag (tag, value)
{
    const arweave = Init ();

    Sys.VERBOSE ("Searching for tag:'" + tag + "'='" + value + "':");
    const files = await arweave.transactions.search (tag, value);    
}



async function GetTx (txid)
{    
    const arweave = Init ();
    tx = await arweave.transactions.get (txid);    
    return tx;
}



async function OutputTxData (txid)
{
    
     const arweave = await Init ();
     arweave.transactions.getData (txid, {decode: true} )                
             .then ( data => { process.stdout.write (data) } );

}

async function GetTxData (txid)
{
    
     const arweave = await Init ();     
     const data = await arweave.transactions.getData (txid, {decode: true} );
     return data;
}


async function GetTxStrData (txid)
{
    
     const arweave = await Init ();
     const data = await arweave.transactions.getData (txid, {decode: true, string: true} );
     return data;
}


async function GetTXsForAddress (address, tags = [] )
{
    const arweave = Init ();
    results = await GQL.RunGQLTransactionQuery (this, address, tags)     
    return results;
}



module.exports = { Init, DisplayArweaveInfo, SearchTag, GetTx, GetTxData, GetTxStrData, 
                   OutputTxData, GetTXsForAddress};