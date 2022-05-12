//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CMD_Test - 2021-12-16_01
// Command 'TEST'
//

const {CommandDef, OutputCMD}  = require ("../CommandDef");
const Util        = require ("../Util");
const Sys         = require ("../System");
const SARTObject  = require ("../SARTObject");
const Field       = require ("../FieldDef");
const Transaction = require ("../Arweave/Transaction");
const TXGroup     = require ("../Arweave/TXGroup");
const Arweave     = require ("../Arweave/Arweave");
const ArgDef      = require ("../ArgumentDef");
const TTY         = require ("../TTY");
const FS          = require ("fs");
const Crypto      = require ("crypto");



class TestObj extends SARTObject
{
    Amount = 0;
    Flags = "-D--"
    Path = null;
    Confirmations = 0;
    State = null;

    constructor ()
    {
        super ();
        this.WithField (new Field ("Name") ),
        this.WithField (new Field ("Amount") ),
        this.WithField (new Field ("Flags") )
        this.WithField (new Field ("Path") )
        this.WithField (new Field ("Confirmations") )
        this.WithField (new Field ("State") )
    }
}


class CMD_Test extends CommandDef
{
    constructor ()
    {
        super ("TEST");
        this.MinArgsAmount = 1;
        this.Subcommands["FIELDS"]      = new CMD_FieldTest   ();
        this.Subcommands["UPLOAD"]      = new CMD_Upload      ();
        this.Subcommands["CREATEDRIVE"] = new CMD_CreateDrive ();
        this.Subcommands["ARGTEST"]     = new CMD_ArgTest     ();
        this.Subcommands["TESTING"]     = new CMD_Testing     ();
        this.Subcommands["UUID"]        = new OutputCMD ("UUID", Util.GetRandomUUIDv4);
    }

}


class CMD_ArgTest extends CommandDef
{
    constructor ()
    {
        super ("ARGTEST");
        this.WithArgs
        (
            new ArgDef ("Foo").WithParamValidFunc ( v => v < 4, "Must be less than 4."),
            new ArgDef ("Bar").WithHasParam (),
            new ArgDef ("solo"),
        );
    }

    OnExecute (cmd_instance)
    {
        console.log (cmd_instance.GetParamValues () );
    }
}

function TestFunc (param1, {name = "foo", value = "bar"} = {} )
{
    console.log ("param1: " + param1);
    console.log ("name:   " + name);
    console.log ("value:  " + value);
}

function TestFunc2 (param1, opts = {name: "foo", value: "bar"})
{
    console.log ("param1: " + param1);
    console.log ("name:   " + opts.name);
    console.log ("value:  " + opts.value);
}

class CMD_Testing extends CommandDef
{
    constructor ()
    {
        super ("TESTING");        
    }

    async OnExecute (cmd_instance)
    {
        //TestFunc  ("override1", {name: "NameOverride"});
        //TestFunc2 ("override1", {name: "NameOverride"});
        const tx1 = new Transaction ("DuVcUb5_80yWXP5mM2zojfsuBR7JqFkiw0spXkpFrv0");
        const tx2 = new Transaction ("sfsdf");

        /*
        const tsk = 
        {
            Test: "Foo",
            Bar:  new TXGroup ().With (tx1, tx2)
        }
        Sys.DEBUG (tsk, {src:"bar", depth:2});
        */
        
        
        const grp = new TXGroup ().With (tx1);
        debugger;
        grp.Output ();
        //Sys.INFO (await grp.FetchStatusOfAll () );
        

        //await TTY.AsyncWithProcessIndicator ({ caption: "Waiting for transactions to be mined and confirmed..." }, tx.WaitForConfirmation (100) );
        //await cmd_instance.ExecuteOperation ( {caption:"Waiting for confirmation"}, tx.WaitForConfirmation (2000) );

    }
}



class CMD_FieldTest extends CommandDef
{
    constructor ()
    {
        super ("FIELDS");
        this.MinArgsAmount = 0;
    }

    async OnExecute (cmd_instance)
    {
        return true;        
    }

    OnOutput (cmd_instance)
    {
        //const test_obj = new TestObj ();
        //test_obj.Output ();
    
        const test_raw =
        {
            Field1   : "foo",
            Field2   : "bar",
            Something: "else"
        }

       SARTObject.FROM_JSOBJ (test_raw).Output ({ UseListMode: true, WantedFields: null});        
    }
        
}


async function CreateArFSDrive (wallet_path, drive_name)
{

    if (! Util.IsSet (drive_name) )
    {
        Sys.ERR_PROGRAM ("drive_name not given!");
        return false;
    }

    const arjs = require ("arweave").init
    (
        {
            host: 'arweave.net',
            port: 443,
            protocol: 'https'
        }
    );
    
    const key      = require (wallet_path);
    const drive_id = Crypto.randomUUID ();
    const root_id  = Crypto.randomUUID ();
    
    const drive_meta =
    {
        name:             drive_name,
        rootFolderId:     root_id,        
    }

    const drivetx = await arjs.createTransaction ( {data: JSON.stringify (drive_meta) }, key)

    drivetx.addTag ("Content-Type",     "application/json"                       );
    drivetx.addTag ("App-Name",         "SART"                                   );
    drivetx.addTag ("App-Version",       Util.GetVersion ()                      );
    drivetx.addTag ("ArFS",             "0.11"                                   );
    drivetx.addTag ("Entity-Type",      "drive"                                  );        
    drivetx.addTag ("Drive-Id",          drive_id                                );           
    drivetx.addTag ("Unix-Time",         parseInt (Util.GetUNIXTimeMS () / 1000) );    
    await arjs.transactions.sign (drivetx, key);

    
    const rootfolder_meta =
    {
        name:             drive_name,        
    }

    const rootfoldertx = await arjs.createTransaction ( {data: JSON.stringify (rootfolder_meta) }, key)
    
    rootfoldertx.addTag ("Content-Type",     "application/json"                       );
    rootfoldertx.addTag ("App-Name",         "SART"                                   );
    rootfoldertx.addTag ("App-Version",       Util.GetVersion ()                      );
    rootfoldertx.addTag ("ArFS",             "0.11"                                   );
    rootfoldertx.addTag ("Entity-Type",      "folder"                                 );        
    rootfoldertx.addTag ("Drive-Id",          drive_id                                );           
    rootfoldertx.addTag ("Folder-Id",         root_id                                 );           
    rootfoldertx.addTag ("Unix-Time",         parseInt (Util.GetUNIXTimeMS () / 1000) );    
    await arjs.transactions.sign (rootfoldertx, key);




    await arjs.transactions.post (drivetx);
    await arjs.transactions.post (rootfoldertx);

    Sys.INFO ("Drive " + drive_id + " created with root folder ID " + root_id + " with transactions " + drivetx.id + " and " + rootfoldertx.id + " .");
}


class CMD_CreateDrive extends CommandDef
{
    constructor ()
    {
        super ("CREATEDRIVE");
        this.MinArgsAmount = 2;
    }

    async OnExecute (cmd_instance)
    {
        await CreateArFSDrive (cmd_instance.Pop (), cmd_instance.Pop () );
    }
}

class CMD_Upload extends CommandDef
{
    constructor ()
    {
        super ("UPLOAD");
        this.MinArgsAmount = 5;
        this.WithArgs
        (
            new ArgDef ("walletfile")
                .WithAliases ("wallet", "w")
                .WithHasParam ()
                .WithDescription ("Path to the wallet.json."),

            new ArgDef ("filename")
                .WithAliases ("file", "f")
                .WithHasParam ()
                .WithDescription ("Path to the file to be uploaded."),

            new ArgDef ("content-type")
                .WithHasParam ()
                .WithAliases ("ct", "mimetype", "mime")
                .WithParamValidFunc (Util.IsMIMEType, "Does not seem to be a valid MIME type.")
                .WithDescription ("MIME type of the file, ie. video/mp4 for a .mp4 file."),

            new ArgDef ("driveid")
                .WithHasParam ()
                .WithIsOptional ()
                .WithAliases ("drive", "drv")
                .WithParamValidFunc (Util.IsArFSID, "Not a valid UUID (should be like 00000000-0000-4000-0000-0123456789ab")
                .WithDescription ("Destination ArFS drive ID. If not supplied, folder ID is used to determine drive ID."),

            new ArgDef ("folderid")
                .WithHasParam ()
                .WithIsOptional ()
                .WithAliases ("folder", "dir")
                .WithParamValidFunc (Util.IsArFSID, "Not a valid UUID (should be like 00000000-0000-4000-0000-0123456789ab")
                .WithDescription ("Destination ArFS folder ID. If not supplied, drive root folder will be used."),

            new ArgDef ("fileid")
                .WithHasParam ()
                .WithIsOptional ()
                .WithAliases ("file-id")
                .WithParamValidFunc (Util.IsArFSID, "Not a valid UUID (should be like 00000000-0000-4000-0000-0123456789ab")
                .WithDescription ("The file ID for the new file, to replace existing one with a new version, or if one wants to come up with their own ID. If not supplied, it will be randomly generated."),                

            new ArgDef ("tag-datatx")
                .WithHasParam ()
                .WithAliases ("tag", "datatxtag", "datatag")
                .WithIsOptional ()
                .WithAllowMultiple ()
                .WithDescription ("Used to define a custom Arweave transaction tag for the data transaction."),

            new ArgDef ("tag-metatx")
                .WithHasParam ()
                .WithAliases ("metatag", "metatxtag")
                .WithIsOptional ()
                .WithAllowMultiple ()
                .WithDescription ("Used to define a custom Arweave transaction tag for the ArFS metadata transaction."),

            new ArgDef ("tag-file")
                .WithAliases ("filetag")
                .WithIsOptional ()
                .WithAllowMultiple ()
                .WithDescription ("Used to define a 'File-<tag>' tag for the data transaction, also adding the tag into the ArFS metadata JSON if present."),                

            new ArgDef ("arfs-meta-field")
                .WithHasParam ()
                .WithAliases ("arfsfield", "arfs-field")
                .WithIsOptional ()
                .WithAllowMultiple ()
                .WithDescription ("Adds a custom field to the ArFS metadata JSON. For uniformity with the protocol convention, the field names should be in lower camel case, ie. 'customProperty'."),  

            new ArgDef ("caption")
                .WithHasParam ()
                .WithIsOptional ()                
                .WithDescription ("A brief caption of what the file is about, such as 'A photo of <insert name here> in 1985.'. Added as a tag 'File-Caption' to the data transaction, and as 'caption' field of ArFS metadata JSON if present."),  

            new ArgDef ("description")
                .WithHasParam ()
                .WithIsOptional ()
                .WithAliases ("comment", "note", "info")                
                .WithDescription ("An optional comment/information about the file, added as a 'File-Description' tag to the data transaction, and as a 'description' field of ArFS metadata JSON if present."), 

            new ArgDef ("keywords")
                .WithHasParam ()
                .WithIsOptional ()                
                .WithDescription ("Add a comma-separated list as a 'Keywords' tag to the data transaction, and to a 'keywords' field on ArFS metadata JSON if present."),                                

            new ArgDef ("url")
                .WithHasParam ()
                .WithIsOptional ()                
                .WithDescription ("Specify the URL from which the file originated. Added as a tag 'File-Source-URL' to the data transaction, and as 'sourceURL' field of ArFS metadata JSON if present."),  

            new ArgDef ("author")
                .WithHasParam ()
                .WithIsOptional ()                
                .WithDescription ("Specify the author of the file. Added as tags 'Author' and 'File-Author' to the data transaction, and as 'author' field of ArFS metadata JSON if present."),                  

            new ArgDef ("minimal")                
                .WithIsOptional ()                
                .WithDescription ("Create transactions containing only the 'Content-Type' tag. Implies no ArFS-transactions."),
        );
    }

    async OnExecute (cmd_instance)
    {
                
        const arjs = Arweave.Init ();

        const key                          = await Arweave.ReadWalletJSON (cmd_instance.GetParamValueByName ("walletfile") );;
        const is_minimal                   = cmd_instance.GetParamValueByName ("minimal") == true;
        const filename                     = cmd_instance.GetParamValueByName ("filename");
        const content_type                 = cmd_instance.GetParamValueByName ("content-type");
        const driveid                      = cmd_instance.GetParamValueByName ("driveid");
        const folderid                     = cmd_instance.GetParamValueByName ("folderid");
        const create_arfs_metadata         = is_minimal == false && driveid != null && folderid != null;
        const fileid                       = Util.Or (cmd_instance.GetParamValueByName ("fileid"), create_arfs_metadata ? Crypto.randomUUID () : null);
        const fileunixtime_ms              = FS.statSync (filename).mtime.getTime ();
        const fileunixtime_sec             = parseInt (fileunixtime_ms / 1000);
        const unixtime_now_sec             = parseInt (Util.GetUNIXTimeMS () / 1000);
        const file_caption                 = cmd_instance.GetParamValueByName ("caption");
        const file_description             = cmd_instance.GetParamValueByName ("description");        
        const file_keywords                = cmd_instance.GetParamValueByName ("keywords");        
        const file_url                     = cmd_instance.GetParamValueByName ("url");        
        const file_author                  = cmd_instance.GetParamValueByName ("author");        
        const filename_nopath              = filename.split ("/").pop ();
        const filename_short               = Util.GetShortString (filename_nopath, 65);
        const source_wallet_addr           = key != null ? await Arweave.GetWalletAddress (key) : null;
        

        if (key == null)
            return false;
        
        const filedata = await TTY.AsyncWithProcessIndicator 
        (
            { caption: "Reading file '" + filename_short + "'..."}, 
            Sys.ReadFile (filename) 
        );    

        if (filedata == null)
            return;
            
            
        Sys.DEBUG ("Starting to build data transaction object..");
        const tx = await TTY.AsyncWithProcessIndicator ({ caption: "Creating data transaction..." }, arjs.createTransaction ( {data: filedata }, key) )

        if (tx == null)
            return Sys.ERR ("Failed to create transaction!");

        tx.addTag ("Content-Type",     content_type       );

        if (!is_minimal)
        {
            tx.addTag ("App-Name",         "SART"             );
            tx.addTag ("App-Version",      Util.GetVersion () );
            tx.addTag ("Type",             "file"             );
            if (create_arfs_metadata)
                tx.addTag ("File-Type",        "ArFS"             );
            tx.addTag ("File-Name",        filename_nopath    );        
            tx.addTag ("File-UnixTime",    fileunixtime_sec   );        
            tx.addTag ("File-UnixTime-ms", fileunixtime_ms    );        
            tx.addTag ("File-SHA256",      Crypto.createHash ("sha256").update (filedata).digest ("hex")    );
            if (Util.IsSet (fileid) )
                tx.addTag ("File-Id",          fileid             );
            if (Util.IsSet (file_caption) )
                tx.addTag ("File-Caption",    file_caption);                    
            if (Util.IsSet (file_description) )
                tx.addTag ("File-Description",    file_description);
            if (Util.IsSet (file_keywords) )
                tx.addTag ("File-Keywords",    file_keywords);   
            if (Util.IsSet (file_author) )
            {
                tx.addTag ("File-Author",       file_author           );            
                tx.addTag ("Author",            file_author           );            
            }
            if (Util.IsSet (file_url) )
                tx.addTag ("File-Source-URL",    file_url);                        
            tx.addTag ("Unix-Time",        unixtime_now_sec);
        }
        Sys.DEBUG ("Data transaction object built.");

        await TTY.AsyncWithProcessIndicator ({ caption: "Signing data transaction.. " }, arjs.transactions.sign (tx, key) );
        


        const txid     = tx.id;
        const filesize = filedata.byteLength;
        

        const arfs_meta =
        {
            name:             filename_nopath,
            size:             filesize, //tx.data.length,
            lastModifiedDate: fileunixtime_ms,
            dataTxId:         txid,
            dataContentType:  content_type,            
        }

        if (Util.IsSet (file_caption) )
            arfs_meta.caption = file_caption;

        if (Util.IsSet (file_description) )
            arfs_meta.description = file_description;            

        if (Util.IsSet (file_keywords) )
            arfs_meta.keywords = file_keywords;                        

        if (Util.IsSet (file_author) )
            arfs_meta.author = file_author;                        

        if (Util.IsSet (file_url) )
            arfs_meta.sourceURL = file_url;                        

        let metatx = null;

        if (create_arfs_metadata)
        {
            metatx = await TTY.AsyncWithProcessIndicator ({ caption: "Creating ArFS-transaction..." }, arjs.createTransaction ( {data: JSON.stringify (arfs_meta) }, key))

            metatx.addTag ("Content-Type",     "application/json"                       );
            metatx.addTag ("App-Name",         "SART"                                   );
            metatx.addTag ("App-Version",       Util.GetVersion ()                      );
            metatx.addTag ("ArFS",             "0.11"                                   );
            metatx.addTag ("Entity-Type",      "file"                                   );        
            metatx.addTag ("Drive-Id",          driveid                                 );   
            metatx.addTag ("Parent-Folder-Id",  folderid                                );   
            metatx.addTag ("File-Id",           fileid                                  );
            //metatx.addTag ("App-Name",         "ArDrive-Web"                            );
            //metatx.addTag ("App-Version",      "1.9.0"                                  );                                
            metatx.addTag ("Unix-Time",         unixtime_now_sec                        );                
            Sys.DEBUG ("ArFS file entity transaction object built.");
            await TTY.AsyncWithProcessIndicator ({ caption: "Signing ArFS-transaction.. " }, arjs.transactions.sign (metatx, key) );
        }       

        const wallet_balance_winston = await Arweave.GetWalletBalance (key);
        const total_cost_winston     = parseInt (tx.reward) + parseInt (metatx != null ? metatx.reward : 0);
        const remaining_winston      = wallet_balance_winston - total_cost_winston;

        Sys.INFO ("*** SOURCE FILE ***");
        Sys.INFO ("");
        Sys.INFO ("File path:    " + filename);
        Sys.INFO ("File size:    " + Util.GetSizeStr (filesize, true) + " (" + filesize + " bytes )");
        Sys.INFO ("Content-Type: " + content_type);        
        if (file_caption != null)
            Sys.INFO ("Caption:      " + file_caption);
        if (file_description != null)
            Sys.INFO ("Description:  " + file_description);
        if (file_keywords != null)
            Sys.INFO ("Keywords:     " + file_keywords);
        if (file_author != null)
            Sys.INFO ("Author:     " + file_author);            
        if (file_url != null)
            Sys.INFO ("Source URL:     " + file_url);

        Sys.INFO ("");

        Sys.INFO ("*** TRANSACTIONS TO BE POSTED ***");
        Sys.INFO ("");
        Sys.INFO (tx.id + " - Data transaction containing file '" + Util.GetShortString (filename_nopath, 65) + "'");        

        if (metatx != null)
        {
            Sys.INFO (metatx.id + " - ArFS metadata transaction (file-entity) of file '" + Util.GetShortString (filename_nopath, 65) + "'");
            Sys.INFO ("");
            Sys.INFO ("Destination drive  ID: " + driveid);
            Sys.INFO ("Destination folder ID: " + folderid);
            Sys.INFO ("New file ID:           " + fileid)
        }

        Sys.INFO ("");

        if (is_minimal)
            Sys.INFO ("! MINIMAL TAGS !");

        Sys.INFO ("Wallet address:  " + source_wallet_addr);
        Sys.INFO ("Wallet balance:  " + wallet_balance_winston + " winston (" + await Arweave.WinstonToAR (wallet_balance_winston)  + " AR)");
        Sys.INFO ("Total cost:      " + total_cost_winston     + " winston (" + await Arweave.WinstonToAR (total_cost_winston)      + " AR)");
        Sys.INFO ("---");
        Sys.INFO ("After upload:    " + remaining_winston      + " winston (" + await Arweave.WinstonToAR (remaining_winston)       + " AR)");

        if (remaining_winston < 0)
            return Sys.ERR ("Insufficient balance on address '" + source_wallet_addr + "'.");
        
        Sys.INFO (await TTY.AsyncWithProcessIndicator ({ caption: "Fetching mempool size.. " }, Arweave.GetMemPoolSize () ) + " transactions pending in the network.");
        Sys.INFO ("");





        if (await Sys.INPUT_GET_CONFIRM (true) != true)
        {
            Sys.INFO ("Operation aborted by the user.");
            return false;
        }


        
        let uploader = await arjs.transactions.getUploader (tx);

        while (! uploader.isComplete) 
        {
            await uploader.uploadChunk ();
            Sys.INFO (uploader.pctComplete + "% done, " + uploader.uploadedChunks + "/" + uploader.totalChunks + " chunks.");
        }        
        Sys.INFO ("Data TXID: " + tx.id);

        if (metatx != null)
        {
            await arjs.transactions.post (metatx);
            Sys.INFO ("ArFS TXID: " + metatx.id);
        }
        


        return true;        
    }

    OnOutput (cmd_instance)
    {        
    }
        
}



module.exports = CMD_Test;