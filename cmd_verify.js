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
const Tag          = GQL.Tag;


const LISTMODE_SUMMARY = "SUMMARY";
const LISTMODE_HEALTHY = "HEALTHY";
const LISTMODE_FAILED  = "FAILED";
const LISTMODE_NUMERIC = "NUMERIC";

const LISTMODES_VALID = [ LISTMODE_SUMMARY, LISTMODE_HEALTHY, LISTMODE_FAILED, LISTMODE_NUMERIC ];


const F_LISTMODE_SUMMARY = 1,
      F_LISTMODE_HEALTHY = 2,
      F_LISTMODE_FAILED  = 4,
      F_LISTMODE_NUMERIC = 8,

      MASK_LISTS = F_LISTMODE_HEALTHY | F_LISTMODE_FAILED | F_LISTMODE_NUMERIC;
      

const LISTMODES_FLAGTABLE =
{
    "STATUS"           : F_LISTMODE_SUMMARY,
    [LISTMODE_SUMMARY] : F_LISTMODE_SUMMARY,
    [LISTMODE_HEALTHY] : F_LISTMODE_HEALTHY,
    [LISTMODE_FAILED]  : F_LISTMODE_FAILED,
    [LISTMODE_NUMERIC] : F_LISTMODE_NUMERIC,
};
    

const SUBCOMMANDS = 
{
    "files": Handler_Uploads,    
};








function Help (args)
{
    Sys.INFO ("VERIFY USAGE");
    Sys.INFO ("------------");
    Sys.INFO ("");
    Sys.INFO ("Verify upload success:")
    Sys.INFO ("   verify files <Drive-ID> [OUTPUT]");
    Sys.INFO ("");
    Sys.INFO ("'OUTPUT' can be any combination of the following flags:");
    Sys.INFO ("   summary,healthy,failed,all,full");
    Sys.INFO ("");
    Sys.INFO ("AN EXAMPLE:")
    Sys.INFO ("   verify files a44482fd-592e-45fa-a08a-e526c31b87f1 summary,failed");
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





function DisplayResults (files, sort = true)
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
                    if (filedata.statuscode == Arweave.TXSTATUS_NOTFOUND)
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



function GenerateNumericList (files, min = -1, max = -1)
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