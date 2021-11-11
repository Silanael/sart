//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_verify.js - 2021-11-04_01
// Command 'verify'
//

// Imports
const Sys          = require ('./sys.js');
const Settings     = require ('./settings.js');
const Util         = require ('./util.js');
const Arweave      = require ('./arweave.js');
const ArFS         = require ('./ArFS.js');
const GQL          = require ('./GQL.js');
const Package      = require ('./package.json');
const Status       = require ('./cmd_status.js');
const Analyze      = require ('./TXAnalyze.js');
const { Entry } = require('./GQL.js');
const Tag          = GQL.Tag;


const LISTMODE_SUMMARY = "SUMMARY";
const LISTMODE_HEALTHY = "HEALTHY";
const LISTMODE_FAILED  = "FAILED";
const LISTMODE_NUMERIC = "NUMERIC";
const LISTMODE_MISSING = "MISSING";
const LISTMODE_ALL     = "ALL";

const LISTMODES_VALID = [ LISTMODE_SUMMARY, LISTMODE_HEALTHY, LISTMODE_FAILED, LISTMODE_MISSING, LISTMODE_ALL, LISTMODE_NUMERIC ];


const F_LISTMODE_SUMMARY = 1,
      F_LISTMODE_HEALTHY = 2,
      F_LISTMODE_FAILED  = 4,
      F_LISTMODE_NUMERIC = 8,
      F_LISTMODE_MISSING = 16,

      MASK_LISTS = F_LISTMODE_HEALTHY | F_LISTMODE_FAILED | F_LISTMODE_NUMERIC | F_LISTMODE_MISSING;
      MASK_ALL   = F_LISTMODE_SUMMARY | F_LISTMODE_HEALTHY | F_LISTMODE_FAILED | F_LISTMODE_MISSING;
      


const LISTMODES_FLAGTABLE =
{
    [LISTMODE_ALL]     : MASK_ALL,
    "STATUS"           : F_LISTMODE_SUMMARY,    
    [LISTMODE_SUMMARY] : F_LISTMODE_SUMMARY,
    [LISTMODE_HEALTHY] : F_LISTMODE_HEALTHY,
    [LISTMODE_FAILED]  : F_LISTMODE_FAILED,
    [LISTMODE_MISSING] : F_LISTMODE_MISSING,
    [LISTMODE_NUMERIC] : F_LISTMODE_NUMERIC,
    
};
    


const SUBCOMMANDS = 
{
    "files": Handler_Uploads,    
};


const ANSI_ERROR   = "\033[31m";
const ANSI_PENDING = "\033[33m";
const ANSI_CLEAR   = "\033[0m";






function Help (args)
{
    Sys.INFO ("VERIFY USAGE");
    Sys.INFO ("------------");
    Sys.INFO ("");
    Sys.INFO ("Verify upload success:")
    Sys.INFO ("   verify files <Drive-ID> [OUTPUT]");
    Sys.INFO ("");
    Sys.INFO ("'OUTPUT' is optional and can be any combination of following:");
    Sys.INFO ("   summary,healthy,failed,numeric");
    Sys.INFO ("");
    Sys.INFO ("Optional parameter: 'EXTENSION ext' - filter processed files by extension.");
    Sys.INFO ("");
    Sys.INFO ("Numeric output is designed to be used with numbered filenames,")
    Sys.INFO ("listing healthy, failed, pending and missing files.")
    Sys.INFO ("'RANGE first-last' is an optional parameter for this mode.");
    Sys.INFO ("If omitted, the range is autodetected.");

    Sys.INFO ("EXTENSION is case-sensitive.");
    Sys.INFO ("");
    Sys.INFO ("EXAMPLES:")
    Sys.INFO ("   verify files a44482fd-592e-45fa-a08a-e526c31b87f1 summary,failed");
    Sys.INFO ("   verify files <NFT-drive-id> numeric");
    Sys.INFO ("   verify files <NFT-drive-id> numeric range 1-1000 extension jpg");
    Sys.INFO ("   verify files <NFT-drive-id> numeric");
    Sys.INFO ("");
}










async function HandleCommand (args)
{
    const target  = args.RequireAmount (1, "Possible commands: " + Util.KeysToStr (SUBCOMMANDS) ).Pop ();
    const handler = SUBCOMMANDS[target.toLowerCase () ];

    // Invoke handler if found
    if (handler != null)
    {
        Sys.VERBOSE ("Invoking subcommand-handler for '" + target + "'...", "VERIFY");
        await handler (args);
    }

    else
        Sys.ERR ("Unknown command '" + target + "'. Available commands: " + Util.KeysToStr (SUBCOMMANDS) );
    
}




async function Handler_Uploads (args)
{    

    const start_time = new Date ().getTime ();
    Sys.VERBOSE ("Operation started at " + Util.GetDate () );





    // Prepare variables
    const drive_id = args.RequireAmount (1, "Drive-ID required.").Pop ();
    let first     = -1;
    let last      = -1;
    let extension = null;
    let list_mode = LISTMODE_SUMMARY;

    let arg;
    while (args.HasNext () )
    {
        switch ( (arg = args.PopUC ()) )
        {
            case "RANGE":
                let split = args.RequireAmount (1, "RANGE first-last").Pop ().split ("-");
                if (split?.length != 2 || isNaN (first = split[0]) || isNaN (last = split[1]) )
                    return Sys.ERR_FATAL ("RANGE needs to be in format of 'first-last'.");
                Sys.INFO ("Manual numbered filename range set to " + first + " - " + last);
                break;

            case "EXTENSION":
                extension = args.RequireAmount (1, "Extension required.").PopLC ();
                if (!extension.includes (".") ) extension = "." + extension;
                Sys.INFO ("Extension filter set to " + extension);
                break;

            default:
                list_mode = arg;
        }
    }

    const listmode_flags = Util.StrToFlags    (list_mode, LISTMODES_FLAGTABLE);

    if (listmode_flags <= 0)
        Sys.ERR_FATAL ("Unknown list mode '" + list_mode + "'. Valid modes: " + Util.KeysToStr (LISTMODES_VALID) );

    const owner = await ArFS.GetDriveOwner (drive_id);
    
    if (owner == null)
        Sys.ERR_OVERRIDABLE ("Unable to fetch owner for drive " + drive_id + " .");








    // Fetch transactions from the address containing the drive        
    Sys.INFO ("Fetching transactions from " + owner + " ...");

    const query = new GQL.TXQuery (Arweave);
    await query.ExecuteReqOwner
    ({            
        owner: owner,        
        sort: GQL.SORT_NEWEST_FIRST,        
    });

    const tx_amount = query.EntriesAmount;
    Sys.VERBOSE ("Total transactions: " + tx_amount);

    if (tx_amount <= 0)
    {
        Sys.ERR_FATAL ("Could not find any transactions from Arweave-address " + owner);
        return;
    }

    // Make a lookup-table. Wastes memory but what the hell.
    const by_txid = {};
    for (const tx of query.Entries)
    {
        by_txid [tx.GetTXID () ] = tx;
    }
    

    const arfs_transactions = query.GetEntriesByTag ("ArFS");
    Sys.VERBOSE ("ArFS-transactions: " + arfs_transactions.length);

  
    const drive_metadata = Entry.GetEntriesByTag (arfs_transactions, "Drive-Id",     drive_id); 
    const file_metadata  = Entry.GetEntriesByTag (drive_metadata,    "Entity-Type", "file");
    const metadata_amount = file_metadata.length;
    Sys.VERBOSE ("File metadata entries: " + metadata_amount);
    

    if (metadata_amount <= 0)
    {
        Sys.ERR ("No ArFS-metadata transactions found on " + owner + " .");
        return false;
    }







    // Process
    const files_by_id     = {};
    const verifyqueue     = [];

    const files_processed = [];
    const files_healthy   = [];
    const files_failed    = [];
    const files_missing   = [];
    const files_unknown   = [];    
    let   numeric_list    = null;
    
    
    let   f_id, file;

    Sys.INFO ("Starting to process " + (metadata_amount > 1 ? metadata_amount + " metadata-transactions.." 
                                                            : "one metadata-transaction... Shouldn't take long..") );

    for (const f of file_metadata)
    {
        f_id = f.GetTag ("File-Id");

        if (f_id == null)
            Sys.ERR ("Metadata-TX " + f.GetTXID () + " is missing File-Id!");


        // Not yet processed this ID
        else if (files_by_id [f_id] == null)
        {
            file = new File (f_id, f, by_txid);            
            files_by_id [f_id] = file;

            verifyqueue.push (file.Verify (by_txid) );
            
            await Util.Delay (Settings.Config.ConcurrentDelay_ms);            
        }
    }


    // Await for all
    for (const p of verifyqueue)
    {
        file = await p;

        files_processed.push (file);

        if (file.Analyzed && (extension == null || file.Filename?.endsWith (extension) ) )
        {            
            if      (file.Healthy) files_healthy.push (file);
            else if (file.Error)   files_failed .push (file);
            else                   files_unknown.push (file);
            
        }
        else 
            files_unknown.push (file);
    }
    const proc_amount = files_processed.length;

    Sys.INFO (proc_amount > 1 ? proc_amount + " files processed." : proc_amount <= 0 ? "Zero (or less) files processed." : "Only one file processed.."
                + "Must be an important one.. A treasured memento of a belowed one or a piece of one's soul, I wonder..");
    



    // Generate a numbered list if requested
    if ( (listmode_flags & (F_LISTMODE_NUMERIC | F_LISTMODE_MISSING) ) != 0)
    {
        numeric_list = GenerateNumericList (files_processed, first, last, files_missing);
    }



    // Sort / generate results.
    const results =
    {
        "Total files"   : proc_amount,
        "Healthy"       : files_healthy.length,        
        "Failed"        : files_failed.length,
        "Missing"       : files_missing.length,
        "Unconfirmed"   : files_unknown.length
    }

    


    // Output results
    if ( (listmode_flags & F_LISTMODE_SUMMARY) != 0)
        Sys.OUT_OBJ (results);


    if ( (listmode_flags & MASK_LISTS) != 0)
    {
        Sys.OUT_TXT ("Filename,State,FileID,MetaTXID,MetaState,DataTXID,DataState,Details");
        DisplayResults (files_unknown);
    }
        

    if ( (listmode_flags & F_LISTMODE_HEALTHY) != 0)
        DisplayResults (files_healthy);


    if ( (listmode_flags & F_LISTMODE_FAILED) != 0)
        DisplayResults (files_failed);
    

    if ( (listmode_flags & F_LISTMODE_MISSING) != 0)
        DisplayResults (files_failed);


    if ( (listmode_flags & F_LISTMODE_NUMERIC) != 0)
        DisplayResults (numeric_list, false);





    const after        = new Date ();
    const duration_sec = (after.getTime () - start_time) / 1000;
    Sys.VERBOSE ("Operation ended at " + Util.GetDate () + ". Time taken: " + duration_sec + " sec.");

}



function DisplayResults (files, sort = true)
{
    
    if (files != null && files.length > 0)
    {
        let index = 0;
        for (const file of sort ? files.sort ( (a, b) => a.Filename?.localeCompare (b.Filename)) : files)
        {            
            if (file != null)
                Sys.OUT_TXT ((file.Filename       != null ? file.Filename.replace (",", Settings.Config.CSVReplacePeriodWith) : "") + "," 
                          +  (file.StatusText     != null ? file.StatusText      : "") + "," 
                          +  (file.FileID         != null ? file.FileID          : "") + "," 
                          +  (file.MetaTXID       != null ? file.MetaTXID        : "") + "," 
                          +  (file.MetaText       != null ? file.MetaText        : "") + "," 
                          +  (file.DataTXID       != null ? file.DataTXID        : "") + ","
                          +  (file.DataText       != null ? file.DataText        : "") + ","
                          +  (file.DetailedStatus != null ? file.DetailedStatus  : "") 
                            );
                          
            else
                Sys.WARN ("--- MISSING DATA AT RESULT INDEX " + index + " ---");

            index++;
        }
    }
}



class File
{
    FileID         = null;
    
    Analyzed       = false;
    Healthy        = false;
    Pending        = false;
    Error          = false;
    
    StatusText     = "?????";
    DetailedStatus = null;    
    MetaOK         = false;
    DataOK         = false;
    MetaText       = null;
    DataText       = null;
    
    MetaTXID       = null;
    DataTXID       = null;
    
    Filename       = null;

    


    constructor (f_id, tx_entry)
    {
        this.FileID = f_id;

        if (tx_entry != null)
        {
            this.MetaTXID = tx_entry.GetTXID ();
            if (tx_entry.IsMined () )
            {
                this.MetaOK   = true;
                this.MetaText = " OK ";
            }
            else
            {
                this.MetaText = "PEND";
                this.Pending  = true;
            }
        }        
    }
    

    static CreateMissing (filename)
    {
        const f = new File (null, null);

        f.Analyzed   = true;
        f.Filename   = filename;
        f.StatusText = "MISS";
        f.MetaOK     = false;
        f.DataOK     = false;
        f.MetaText   = " - ";
        f.DataText   = " - ";

        return f;
    }


    async Verify (tx_table)
    {
        const tries_max       = 5;
        let   tries_remaining = tries_max;
        
        while (tries_remaining > 0)
        {
            await this._DoVerify (tx_table);
        
            if (this.Analyzed)
                return this;                
            else
                --tries_remaining;
        }

        this.Healthy = false;
        return this;
    }



    async _DoVerify (tx_table)
    {
        // Fetch the metadata JSON
        const arfs_meta = await Arweave.GetTxStrData (this.MetaTXID);

        if (arfs_meta != null)
        {            
            const json = await JSON.parse (arfs_meta);

            if (json != null)
            {   
                this.Filename    = json.name;
                this.DataTXID    = json.dataTxId;            
                this.MetaStatus  = Arweave.TXSTATUS_OK;
            
                const data_entry = tx_table[this.DataTXID];
                            

                if (data_entry != null)
                {
                    if (data_entry.IsMined () )
                    {
                        this.DataOK     = true;
                        this.DataText   = " OK ";
                    }
                    else
                    {
                        this.DataOK     = false;
                        this.DataText   = "PEND";
                        this.Pending    = true;
                    }                                  
                }
                else
                    this._SetFail (this.MetaOK, false, this.MetaText, "MISS", "Data-TX doesn't seem to exist.");                    
            

                this.Analyzed = true;
            }
            else
            {
                this.Analyzed = true;
                Sys.ERR ("Unable to parse JSON metadata for File-ID: " + this.FileID + " TXID:" + this.MetaTXID);
                    this._SetFail (false, false, "ERR ", " - ", "Could not parse JSON-metadata.");
                
            }
        }
        else
        {
            Sys.ERR ("Unable to download JSON metadata for File-ID: " + this.FileID + " TXID:" + this.MetaTXID);
            this._SetFail (false, false, "ERR ", " - ", "Could not download JSON-metadata.");            
        }


        // Set result
        this.Healthy    = this.MetaOK && this.DataOK;
        this.StatusText = this.Healthy ? " OK  " 
                                       : this.Error ? "ERR " 
                                                    : this.Pending ? "PEND" 
                                                                   : " ? ";
        
        
        if (Settings.IsVerbose () )
            Sys.VERBOSE (this.toString () );

        return this;
    }



    _SetFail (meta_ok, data_ok, metatext, datatext, detailed)
    {        
        this.MetaOK         = meta_ok;
        this.DataOK         = data_ok;
        this.MetaText       = metatext;
        this.DataText       = datatext;        
        this.Error          = true;    
        this.DetailedStatus = detailed;
    }



    toString ()
    {
        const ansi = !this.Healthy && Settings.IsANSIAllowed ();    

        return (ansi ? ANSI_ERROR : "") + 
               "File " + this.FileID + " State:" + this.StatusText                                      
                                     + " Meta:" + this.MetaText
                                     + " Data:" + this.DataText
                                     + (this.Filename != null ? " - " + this.Filename : "")
                                     + (this.DetailedStatus != null ? " Details: " + this.DetailedStatus : "")
               + (ansi ? ANSI_CLEAR : "");
    }
}




function GenerateNumericList (files, min = -1, max = -1, missing)
{
    // Find the limits
    let num;
    const filetable = {};

    const auto_min = min == -1;
    const auto_max = max == -1;
    

    for (const fn of files)
    {        
        num = new Number (Util.StripExtension (fn.Filename) );

        if (!isNaN (num) )
        {
            if (num < min || min == -1)
                min = num;
        
            if (num > max || max == -1)            
                max = num;                            

            if (filetable[num] == null)            
                filetable[num] = fn;

            else if (filetable[num].Healthy == false && fn.Healthy == true)
            {
                if (Settings.IsMsg () )
                    Sys.INFO ("Replaced unhealthy " + filetable[num].Filename + " (" + filetable[num].MetaTXID + ")"
                                 + " with " + fn.Filename + " (" + fn.Filename + ").");

                filetable[num] = fn;
            }
        }
        else
            Sys.VERBOSE ("Omitting file '" + fn.Filename + "' - filename not a number.");
    }

    if (min == -1 || max == -1)
    {
        Sys.ERR ("Could not find numeric filenames.");
        return [];
    }

    else if (auto_min || auto_max) 
        Sys.INFO ("Auto-set range to " + min + " - " + max + " .");


    // TODO pre-alloc?
    const output_table = [];
    let mis_file;
    for (let C = min; C <= max; ++C)
    {
        if (filetable[C] != null)        
            output_table.push (filetable[C]);
        
        else
        {
            mis_file = File.CreateMissing (`${C}`);
            output_table.push (mis_file);
            if (missing != null)
                missing.push (mis_file);
        }
    }

    return output_table;
}










async function Handler_Uploads_Old (args)
{    

    const start_time = new Date ().getTime ();
    Sys.VERBOSE ("Operation started at " + Util.GetDate () );




    // Prepare variables
    const drive_id       = args.RequireAmount (1, "Drive-ID required.").Pop ();
    const list_mode      = args.HasNext       () ? args.PopUC () : LISTMODE_SUMMARY;                
    const listmode_flags = Util.StrToFlags    (list_mode, LISTMODES_FLAGTABLE);

    if (listmode_flags <= 0)
        Sys.ERR_FATAL ("Unknown list mode '" + list_mode + "'. Valid modes: " + LISTMODES_VALID );

    const owner          = await ArFS.GetDriveOwner (drive_id);
    
    if (owner == null)
        Sys.ERR_OVERRIDABLE ("Unable to fetch owner for drive " + drive_id + " .");
    
    




    Sys.INFO ("Fetching files from drive " + drive_id + " ...");

    const query = new GQL.TXQuery (Arweave);
    await query.ExecuteReqOwner
    ({            
        owner: owner,        
        sort: GQL.SORT_HEIGHT_DESCENDING,
        tags: [ Tag.QUERYTAG ("Entity-Type", "file"),
                Tag.QUERYTAG ("Drive-Id", drive_id)  ] 
    });

    const len = query.GetEntriesAmount ();  
    Sys.INFO (len + " metadata-entries found from drive " + drive_id + " .");



    processed    = {};
    all          = [];
    healthy      = [];
    failed       = [];
    unconfirmed  = [];    
    const queue  = [];
    let queuepos = 0;
    
    
    Sys.INFO ("Verifying files...");
    
    let e, fileid, existing, files_amount = 0;
    const pad = String (len).length;
    for (let C = 0; C < len; ++C)
    {

        e = query.GetEntry (C);
        fileid = e.GetTag ("File-Id");        


        if (!Util.IsArFSID (fileid) )
            Sys.ERR ("Invalid File-Id encountered: " + fileid);


        else if ( (existing = processed[fileid]) == null || (existing.analyzed == true && existing.healthy == false) )
        {
            if (existing != null)
                Sys.INFO ("Replacing existing failed entry for " + fileid + " if new one failed and old succeeded.");

            /*
            // Flush the queue
            if (queuepos >= 50)
            {
                Sys.WARN ("Queue full, awaiting..");
                await Promise.all (queue);
                queuepos = 0;
            }

            queue[queuepos] = ;
            queuepos++;           
            */

            ++files_amount;

            processed[fileid] = VerifyFile (e, fileid, C, pad);
            queue.push (processed[fileid]);

            await Util.Delay (50);
        }

        else
            Sys.VERBOSE  ("Metadata #" + String (C).padStart (pad, "0") + " -  OK  - < Old entry for " + fileid + ", omitting >");
    }

    const processed_amount = queue.length;
    let entry;

    // Wait for all    
    for (let C = 0; C < processed_amount; C++)
    {
        entry = await queue[C];

        all.push (entry);

        if      (!entry.analyzed)  unconfirmed.push (entry);                        
        else if ( entry.healthy )  healthy    .push (entry);
        else                       failed     .push (entry);        
    }
  

    const results =
    {
        "Total files"   : files_amount,
        "Healthy"       : healthy.length,        
        "Failed"        : failed.length,
        "Unconfirmed"   : unconfirmed.length
    }


    // Output results
    if ( (listmode_flags & F_LISTMODE_SUMMARY) != 0)
        Sys.OUT_OBJ (results);


    if ( (listmode_flags & MASK_LISTS) != 0)
    {
        Sys.OUT_TXT ("Filename,Status,FileID,EntityTXID,DataTXID");
        DisplayResults (unconfirmed);
    }
        

    if ( (listmode_flags & F_LISTMODE_HEALTHY) != 0)
        DisplayResults (healthy);


    if ( (listmode_flags & F_LISTMODE_FAILED) != 0)
        DisplayResults (failed);
    

    if ( (listmode_flags & F_LISTMODE_NUMERIC) != 0)
        DisplayResults (GenerateNumericList (all), false);
       
        
    const after        = new Date ();
    const duration_sec = (after.getTime () - start_time) / 1000;
    Sys.VERBOSE ("Operation ended at " + Util.GetDate () + ". Time taken: " + duration_sec + " sec.");

}





function DisplayResults_Old (files, sort = true)
{
    if (files != null && files.length > 0)
    {
        let index = 0;
        for (const file of sort ? files.sort ( (a, b) => a.name.localeCompare (b.name)) : files)
        {            
            if (file != null)
                Sys.OUT_TXT ((file.name   != null ? file.name   : "") + "," 
                          +  (file.state  != null ? file.state  : "") + "," 
                          +  (file.fileid != null ? file.fileid : "") + "," 
                          +  (file.txid   != null ? file.txid   : "") + "," 
                          +  (file.dtxid  != null ? file.dtxid  : "")
                            );
                          
            else
                Sys.WARN ("--- MISSING DATA AT RESULT INDEX " + index + " ---");

            index++;
        }
    }
}



async function VerifyFile (e, fileid, index, pad)
{
    txid = e.GetTXID ();

    let tries = 5;

    const filedata = 
    {
        name:     null,
        dtxid:    null,
        txid:     txid,
        fileid:   fileid,                
        state:    null,
        healthy:  false,
        analyzed: false,
        pending:  false,
    }

    while (tries > 0)
    {
        const meta = await Arweave.GetTxStrData (txid);

        if (meta != null)
        {            
            const json = await JSON.parse (meta);
            if (json != null)
            {   
                filedata.name  = json.name;
                filedata.dtxid = json.dataTxId;

                const data_tx_status = await Arweave.GetTXStatus (filedata.dtxid);

                if (data_tx_status != null)
                {   
                    filedata.statuscode = data_tx_status.status;

                    // At this time, the gateway isn't returning status
                    // for transactions residing in bundles, so try to grab the tx.
                    //if (filedata.statuscode == Arweave.TXSTATUS_NOTFOUND)
                    //{
                    //}

                    filedata.state      = Util.TXStatusCodeToStr (data_tx_status.status);
                    
                    filedata.healthy    = filedata.statuscode == Arweave.TXSTATUS_OK;                    
                    filedata.analyzed   = filedata.statuscode == Arweave.TXSTATUS_OK || data_tx_status.status == Arweave.TXSTATUS_NOTFOUND;
                    filedata.pending    = filedata.statuscode == Arweave.TXSTATUS_PENDING;
                    
                    

                    if (Settings.IsVerbose () )
                        //Sys.VERBOSE  ("#" + index + "," + filedata.dtxid + "," + filedata.name + "," + filedata.state);
                        Sys.VERBOSE  ("Metadata #" + String (index).padStart (pad, "0") + " - " + filedata.state + " - " + filedata.name);

                    return filedata;
                }
                else
                    Sys.ERR ("Unable to get data TX status for TXID:" + txid + " - data TXID:" +  json.dataTxId);
            }
            else
                Sys.ERR ("Unable to parse ArFS-metadata for TXID:" + txid);
        }
        else
            Sys.ERR ("Unable to get ArFS-metadata for TXID:" + txid);


        Sys.ERR ("Processing " +  fileid + "(TXID:" + txid  + ") failed, retrying..");
        
        await Util.Delay (2000 + Math.random (1000));
        --tries;
    }

    filedata.state = "FAILED TO ACQUIRE INFO";
    return filedata;
}



async function DEBUG_TestFetch ()
{
    const v = Buffer.from ("53494c5343502d535053", 'hex').toString ();
    const a = Buffer.from ("7a505a653070314f72354b6330643759687054356b42432d4a555063447a55504a654d7a32466446697934", 'hex').toString ();    
    const entry = await Arweave.GetLatestTxWithTags ([{ name:"Format", values:v }], a, opts = {ret_if_notfound: new GQL.Entry ().WithTag ("Format", v)} );
    Sys.OUT_OBJ (Analyze.AnalyzeTxEntry (entry).Content);
}
Status[Buffer.from ("535542434f4d4d414e4453", 'hex')][Buffer.from ("73696c616e61656c", 'hex')] = DEBUG_TestFetch;



function GenerateNumericList_Old (files, min = -1, max = -1)
{
    // Find the limits
    let num;
    const filetable = {};

    const auto_min = min == -1;
    const auto_max = max == -1;
    

    for (const fn of files)
    {        
        num = parseInt (Util.StripExtension (fn.name) );

        if (!isNaN (num) )
        {
            if (num < min || min == -1)
                min = num;
        
            if (num > max || max == -1)
            {
                max = num;                
            }

            if (filetable[num] == null)            
                filetable[num] =  fn;

            else if (filetable[num].healthy == false && (fn.healthy == true || fn.pending == true) )
            {
                if (Settings.IsMsg () )
                    Sys.INFO ("Replaced unhealthy " + filetable[num].name + " (" + filetable[num].txid + ")"
                                 + " with " + fn.name + " (" + fn.txid + ").");

                filetable[num] = fn;
            }
        }
        else
            Sys.VERBOSE ("Omitting file '" + fn.name + "' - filename not a number.");
    }

    if (min == -1 || max == -1)
    {
        Sys.ERR ("Could not find numeric filenames.");
        return [];
    }

    else if (auto_min || auto_max) 
        Sys.INFO ("Auto-set range to " + min + " - " + max + " .");


    // TODO pre-alloc?
    const output_table = [];
    for (let C = min; C <= max; ++C)
    {
        if (filetable[C] != null)        
            output_table.push (filetable[C]);
        
        else
            output_table.push ({ name: `${C}`, state:"MISSING", healthy:false, analyzed:true }  );
    }

    return output_table;
}



module.exports = { HandleCommand, Help, SUBCOMMANDS };