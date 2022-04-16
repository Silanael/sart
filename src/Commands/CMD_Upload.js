//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_status.js - 2022-04-04_01
// Command 'upload'
//
// Uploading data to Arweave.
//

const {CommandDef} = require ("../CommandDef");
const Util         = require ("../Util");
const Sys          = require ("../System");
const SARTObject   = require ("../SARTObject");
const Field        = require ("../FieldDef");
const Transaction  = require ("../Arweave/Transaction");
const Arweave      = require ("../Arweave/Arweave");
const ArgDef       = require ("../ArgumentDef");
const TTY          = require ("../TTY");
const FS           = require ("fs");
const Crypto       = require ("crypto");
const ARGDEFS      = require ("../ARGUMENTDEFS");


const ArgDefs = 
{
    Filename:    new ArgDef ("filename")
                 .WithAliases ("file", "f")
                 .WithHasParam ()
                 .WithDescription ("Path to the file to be uploaded."),

    ContentType: new ArgDef ("content-type")
                 .WithHasParam ()
                 .WithAliases ("ct", "mimetype", "mime")
                 .WithParamValidFunc (Util.IsMIMEType, "Does not seem to be a valid MIME type.")
                 .WithDescription ("MIME type of the file, ie. video/mp4 for a .mp4 file."),  
                 
    DriveID:     new ArgDef ("driveid")
                 .WithHasParam ()
                 .WithIsOptional ()
                 .WithAliases ("drive", "drv")
                 .WithParamValidFunc (Util.IsArFSID, "Not a valid UUID (should be like 00000000-0000-4000-0000-0123456789ab")
                 .WithDescription ("Destination ArFS drive ID. If not supplied, folder ID is used to determine drive ID."),
 
    FolderID:    new ArgDef ("folderid")
                 .WithHasParam ()
                 .WithIsOptional ()
                 .WithAliases ("folder", "dir")
                 .WithParamValidFunc (Util.IsArFSID, "Not a valid UUID (should be like 00000000-0000-4000-0000-0123456789ab")
                 .WithDescription ("Destination ArFS folder ID. If not supplied, drive root folder will be used."),
                 
    FileID:      new ArgDef ("fileid")
                 .WithHasParam ()
                 .WithIsOptional ()
                 .WithAliases ("file-id")
                 .WithParamValidFunc (Util.IsArFSID, "Not a valid UUID (should be like 00000000-0000-4000-0000-0123456789ab")
                 .WithDescription ("The file ID for the new file, to replace existing one with a new version, or if one wants to come up with their own ID. If not supplied, it will be randomly generated."),                
 
    Tag_DataTX:  new ArgDef ("tag-datatx")
                 .WithHasParam ()
                 .WithAliases ("tag", "datatxtag", "datatag")
                 .WithIsOptional ()
                 .WithAllowMultiple ()
                 .WithDescription ("Used to define a custom Arweave transaction tag for the data transaction."),
 
    Tag_MetaTX:  new ArgDef ("tag-metatx")
                 .WithHasParam ()
                 .WithAliases ("metatag", "metatxtag")
                 .WithIsOptional ()
                 .WithAllowMultiple ()
                 .WithDescription ("Used to define a custom Arweave transaction tag for the ArFS metadata transaction."),
 
    Tag_File:   new ArgDef ("tag-file")
                 .WithAliases ("filetag")
                 .WithIsOptional ()
                 .WithAllowMultiple ()
                 .WithDescription ("Used to define a 'File-<tag>' tag for the data transaction, also adding the tag into the ArFS metadata JSON if present."),                
 
    Tag_ArfSMeta: new ArgDef ("arfs-meta-field")
                 .WithHasParam ()
                 .WithAliases ("arfsfield", "arfs-field")
                 .WithIsOptional ()
                 .WithAllowMultiple ()
                 .WithDescription ("Adds a custom field to the ArFS metadata JSON. For uniformity with the protocol convention, the field names should be in lower camel case, ie. 'customProperty'."),  
 
    Caption:      new ArgDef ("caption")
                 .WithHasParam ()
                 .WithIsOptional ()                
                 .WithDescription ("A brief caption of what the file is about, such as 'A photo of <insert name here> in 1985.'. Added as a tag 'File-Caption' to the data transaction, and as 'caption' field of ArFS metadata JSON if present."),  
 
    Description: new ArgDef ("description")
                 .WithHasParam ()
                 .WithIsOptional ()
                 .WithAliases ("comment", "note", "info")                
                 .WithDescription ("An optional comment/information about the file, added as a 'File-Description' tag to the data transaction, and as a 'description' field of ArFS metadata JSON if present."), 
 
    Keywords:    new ArgDef ("keywords")
                 .WithHasParam ()
                 .WithIsOptional ()                
                 .WithDescription ("Add a comma-separated list as a 'Keywords' tag to the data transaction, and to a 'keywords' field on ArFS metadata JSON if present."),                                
 
    URL:         new ArgDef ("url")
                 .WithHasParam ()
                 .WithIsOptional ()                
                 .WithDescription ("Specify the URL from which the file originated. Added as a tag 'File-Source-URL' to the data transaction, and as 'sourceURL' field of ArFS metadata JSON if present."),  
 
    Author:      new ArgDef ("author")
                 .WithHasParam ()
                 .WithIsOptional ()                
                 .WithDescription ("Specify the author of the file. Added as tags 'Author' and 'File-Author' to the data transaction, and as 'author' field of ArFS metadata JSON if present."),                  
 
    Minimal:     new ArgDef ("minimal")                
                 .WithIsOptional ()                
                 .WithDescription ("Create transactions containing only the 'Content-Type' tag. Implies no ArFS-transactions."),                 
}


class CMD_Upload extends CommandDef
{
    constructor ()
    {
        super ("UPLOAD");

        this.MinArgsAmount = 5;

        this.WithArgs (ARGDEFS.WalletFile);
        this.WithArgs (...Object.values (ArgDefs) );        
    }

    async OnExecute (cmd_instance)
    {
                
        const key                          = await Arweave.ReadWalletJSON (cmd_instance.GetParamValueByName ("walletfile") );;
        const is_minimal                   = cmd_instance.GetParamValueByName ("minimal") == true;
        const filename                     = cmd_instance.GetParamValueByName ("filename");
        const content_type                 = cmd_instance.GetParamValueByName ("content-type");
        const driveid                      = cmd_instance.GetParamValueByName ("driveid");
        const folderid                     = cmd_instance.GetParamValueByName ("folderid");
        const create_arfs_metadata         = is_minimal == false && driveid != null && folderid != null;
        const file_id                       = Util.Or (cmd_instance.GetParamValueByName ("fileid"), create_arfs_metadata ? Crypto.randomUUID () : null);
        const fileunixtime_ms              = FS.statSync (filename).mtime.getTime ();
        const fileunixtime_sec             = parseInt (fileunixtime_ms / 1000);
        const unixtime_now_sec             = parseInt (Util.GetUNIXTimeMS () / 1000);
        const file_caption                 = cmd_instance.GetParamValueByName ("caption");
        const file_description             = cmd_instance.GetParamValueByName ("description");        
        const file_keywords                = cmd_instance.GetParamValueByName ("keywords");        
        const file_url                     = cmd_instance.GetParamValueByName ("url");        
        const file_author                  = cmd_instance.GetParamValueByName ("author");
        const file_type                    = create_arfs_metadata ? "ArFS" : null;
        const filename_nopath              = filename.split ("/").pop ();
        const filename_short               = Util.GetShortString (filename_nopath, 65);
        const source_wallet_addr           = key != null ? await Arweave.GetWalletAddress (key) : null;
        
        const transactions                 = [];

        if (key == null)
            return false;
        
        const filedata = await TTY.AsyncWithProcessIndicator 
        (
            { caption: "Reading file '" + filename_short + "'..."}, 
            Sys.ReadFile (filename) 
        );    

        if (filedata == null)
            return;
            
        const file_hash_sha256 = Crypto.createHash ("sha256").update (filedata).digest ("hex");
        const file_size_bytes  = filedata.byteLength;    


        Sys.DEBUG ("Starting to build data transaction...");
        
        const datatx = Transaction.NEW ()
            .WithTag ("Content-Type", content_type)
            .WithTags 
            ([
                "App-Name",         "SART",
                "App-Version",      Util.GetVersion (),
                "Type",             "file",
                "Unix-Time",        unixtime_now_sec,                
                "File-Name",        filename_nopath,
                "File-UnixTime",    fileunixtime_sec,
                "File-UnixTime-ms", fileunixtime_ms,
                "File-SHA256",      file_hash_sha256,
                "File-Hash",        file_hash_sha256,
                "File-Size-Bytes",  file_size_bytes,
            ])
            .WithTagIfValueSet ("File-Id",          file_id)
            .WithTagIfValueSet ("File-Type",        file_type)
            .WithTagIfValueSet ("File-Caption",     file_caption)
            .WithTagIfValueSet ("File-Description", file_description)
            .WithTagIfValueSet ("File-Keywords",    file_keywords)
            .WithTagIfValueSet ("File-Author",      file_author)
            .WithTagIfValueSet ("Author",           file_author)
            .WithTagIfValueSet ("File-Source-URL",  file_url)
                                
        if ( ! await TTY.AsyncWithProcessIndicator ({ caption: "Creating data transaction..." }, datatx.CreateAndSign ({ data: filedata, key: key} ) ) )
            return this.OnError ("Failed to create/sign a transaction. Aborting.");

        //else
            //transactions.push (datatx);

        const datatxid = datatx.GetTXID ();
        



        if (create_arfs_metadata)
        {
            Sys.DEBUG ("Starting to build ArFS metadata..");
            const arfs_metadata =
            {
                name:             filename_nopath,
                size:             file_size_bytes, //tx.data.length,
                lastModifiedDate: fileunixtime_ms,
                dataTxId:         "3ljXt6uccnfaX_mgDVMe1RlB-66pOvD3wwkfD03KSSo", //datatxid,
                dataContentType:  content_type,            
            }
            Util.SetPropertyIfValueNotNull (arfs_metadata, "caption",     file_caption);
            Util.SetPropertyIfValueNotNull (arfs_metadata, "description", file_description);
            Util.SetPropertyIfValueNotNull (arfs_metadata, "keywords",    file_keywords);
            Util.SetPropertyIfValueNotNull (arfs_metadata, "author",      file_author);
            Util.SetPropertyIfValueNotNull (arfs_metadata, "sourceURL",   file_url);

            const arfs_metadata_json = Util.ObjToJSON (arfs_metadata);
            
            if (arfs_metadata_json == null)
            {
                this.OnProgramError ("Failed to stringify the created ArFS-metadata. Aborting.");
                Sys.DEBUG (arfs_metadata);
                return false;
            }

            Sys.DEBUG ("Starting to build ArFS metadata transaction...");

            const arfs_metatx = Transaction.NEW ()
            .WithTags 
            ([
                "Content-Type",     "application/json",
                "App-Name",         "SART",
                "App-Version",      Util.GetVersion (),
                "Type",             "ArFS file-entity",
                "Unix-Time",        unixtime_now_sec,                
                "ArFS",             "0.11",
                "Entity-Type",      "file",
                "Drive-Id",         driveid,
                "Parent-Folder-Id", folderid,
                "File-Id",          "4b10e2e7-d264-4e89-8ac4-a0aaef1c87db", //, //file_id,

                "File-Name",        filename_nopath,
                "File-UnixTime",    fileunixtime_sec,
                "File-UnixTime-ms", fileunixtime_ms,
                "File-SHA256",      file_hash_sha256,
                "File-Hash",        file_hash_sha256,
                "File-Size-Bytes",  file_size_bytes,
            ])                        
            .WithTagIfValueSet ("File-Caption",     file_caption)
            .WithTagIfValueSet ("File-Description", file_description)
            .WithTagIfValueSet ("File-Keywords",    file_keywords)
            .WithTagIfValueSet ("File-Author",      file_author)            
            .WithTagIfValueSet ("File-Source-URL",  file_url)
    
            
            if (! await TTY.AsyncWithProcessIndicator ({ caption: "Creating ArFS metadata transaction..." }, 
                                                         arfs_metatx.CreateAndSign ({ data: arfs_metadata_json, key: key} ) ) )
            {
                this.OnError ("Failed to create/sign an ArFS metadata transaction.");

                if (await Sys.INPUT_GET_YESNO ("Proceed anyway?", false) != true)
                    return this.OnError ("Posting the transaction aborted.");
            }
            else
                transactions.push (arfs_metatx);

        }




        for (const t of transactions)
        {
            t.Output ();
        }
        

        if (await Sys.INPUT_GET_CONFIRM (true) != true)
        {
            Sys.INFO ("Operation aborted by the user.");
            return false;
        }        

        for (const t of transactions)
        {
            await TTY.AsyncWithProcessIndicator ({ caption: "Posting transaction " + t.GetTXID () + " ..." }, t.Post () );
        }

        return true;

        process.exit ();

        datatx.addTag ("Content-Type",     content_type       );

        if (!is_minimal)
        {
            datatx.addTag ("App-Name",         "SART"             );
            datatx.addTag ("App-Version",      Util.GetVersion () );
            datatx.addTag ("Type",             "file"             );
            if (create_arfs_metadata)
                datatx.addTag ("File-Type",        "ArFS"             );
            datatx.addTag ("File-Name",        filename_nopath    );        
            datatx.addTag ("File-UnixTime",    fileunixtime_sec   );        
            datatx.addTag ("File-UnixTime-ms", fileunixtime_ms    );        
            datatx.addTag ("File-SHA256",      Crypto.createHash ("sha256").update (filedata).digest ("hex")    );
            if (Util.IsSet (file_id) )
                datatx.addTag ("File-Id",          file_id             );
            if (Util.IsSet (file_caption) )
                datatx.addTag ("File-Caption",    file_caption);                    
            if (Util.IsSet (file_description) )
                datatx.addTag ("File-Description",    file_description);
            if (Util.IsSet (file_keywords) )
                datatx.addTag ("File-Keywords",    file_keywords);   
            if (Util.IsSet (file_author) )
            {
                datatx.addTag ("File-Author",       file_author           );            
                datatx.addTag ("Author",            file_author           );            
            }
            if (Util.IsSet (file_url) )
                datatx.addTag ("File-Source-URL",    file_url);                        
            datatx.addTag ("Unix-Time",        unixtime_now_sec);
        }
        Sys.DEBUG ("Data transaction object built.");

        await TTY.AsyncWithProcessIndicator ({ caption: "Signing data transaction.. " }, arjs.transactions.sign (datatx, key) );
        


        const txid     = datatx.id;
        const filesize = filedata.byteLength;
        

        const arfs_meta =
        {
            name:             filename_nopath,
            size:             file_size_bytes, //tx.data.length,
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
            metatx.addTag ("File-Id",           file_id                                  );
            //metatx.addTag ("App-Name",         "ArDrive-Web"                            );
            //metatx.addTag ("App-Version",      "1.9.0"                                  );                                
            metatx.addTag ("Unix-Time",         unixtime_now_sec                        );                
            Sys.DEBUG ("ArFS file entity transaction object built.");
            await TTY.AsyncWithProcessIndicator ({ caption: "Signing ArFS-transaction.. " }, arjs.transactions.sign (metatx, key) );
        }       

        const wallet_balance_winston = await Arweave.GetWalletBalance (key);
        const total_cost_winston     = parseInt (datatx.reward) + parseInt (metatx != null ? metatx.reward : 0);
        const remaining_winston      = wallet_balance_winston - total_cost_winston;

        Sys.INFO ("*** SOURCE FILE ***");
        Sys.INFO ("");
        Sys.INFO ("File path:    " + filename);
        Sys.INFO ("File size:    " + Util.GetSizeStr (file_size_bytes, true) + " (" + file_size_bytes + " bytes )");
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
        Sys.INFO (datatx.id + " - Data transaction containing file '" + Util.GetShortString (filename_nopath, 65) + "'");        

        if (metatx != null)
        {
            Sys.INFO (metatx.id + " - ArFS metadata transaction (file-entity) of file '" + Util.GetShortString (filename_nopath, 65) + "'");
            Sys.INFO ("");
            Sys.INFO ("Destination drive  ID: " + driveid);
            Sys.INFO ("Destination folder ID: " + folderid);
            Sys.INFO ("New file ID:           " + file_id)
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


        
        let uploader = await arjs.transactions.getUploader (datatx);

        while (! uploader.isComplete) 
        {
            await uploader.uploadChunk ();
            Sys.INFO (uploader.pctComplete + "% done, " + uploader.uploadedChunks + "/" + uploader.totalChunks + " chunks.");
        }        
        Sys.INFO ("Data TXID: " + datatx.id);

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

module.exports = CMD_Upload;