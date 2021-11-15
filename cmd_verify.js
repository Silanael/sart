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
const { Entry }    = require('./GQL.js');
const Tag          = GQL.Tag;


const LISTMODE_SUMMARY         = "SUMMARY";
    
const LISTMODE_PROCESSED       = "PROCESSED";
const LISTMODE_FILTERED        = "FILTERED";
    
const LISTMODE_VERIFIED        = "VERIFIED";
const LISTMODE_NOT_VERIFIED    = "NOT-VERIFIED";
const LISTMODE_REUPLOAD_NEEDED = "REUPLOAD-NEEDED";

const LISTMODE_FAILED          = "FAILED";
const LISTMODE_PENDING         = "PENDING";
const LISTMODE_MISSING         = "MISSING";
const LISTMODE_ERROR           = "ERROR";
const LISTMODE_UNKNOWN         = "UNKNOWN";
      
const LISTMODE_ALL             = "ALL";
const LISTMODE_ALL_SEP         = "ALL-SEPARATE";


const LISTMODES_VALID = [ LISTMODE_SUMMARY, LISTMODE_VERIFIED, LISTMODE_NOT_VERIFIED, LISTMODE_FAILED, LISTMODE_MISSING, LISTMODE_UNKNOWN, 
                          LISTMODE_PENDING, LISTMODE_FILTERED, LISTMODE_ALL, LISTMODE_ALL_SEP, LISTMODE_PROCESSED, LISTMODE_REUPLOAD_NEEDED, LISTMODE_ERROR];


const F_LISTMODE_SUMMARY         = 1,
      F_LISTMODE_FILTERED        = 2,
      F_LISTMODE_VERIFIED        = 4,
      F_LISTMODE_FAILED          = 8,      
      F_LISTMODE_MISSING         = 16,
      F_LISTMODE_UNKNOWN         = 32,
      F_NUMERIC                  = 64,
      F_LISTMODE_PROCESSED       = 128,
      F_LISTMODE_PENDING         = 256,
      F_LISTMODE_NOT_VERIFIED    = 512,
      F_LISTMODE_REUPLOAD_NEEDED = 1024,
      F_LISTMODE_ERROR           = 2048, // Yes, yes, I'm aware I could just do 1 << 11 etc. Leave my numbers be.
    
      F_LISTMODE_ALL       = F_LISTMODE_FILTERED | F_LISTMODE_ERROR,
      F_LISTMODE_ALL_SEP   = F_LISTMODE_VERIFIED | F_LISTMODE_FAILED | F_LISTMODE_ERROR | F_LISTMODE_MISSING | F_LISTMODE_PENDING,
    

      MASK_LISTS           = F_LISTMODE_ALL_SEP | F_LISTMODE_FILTERED | F_LISTMODE_PROCESSED 
                           | F_LISTMODE_NOT_VERIFIED | F_LISTMODE_REUPLOAD_NEEDED | F_LISTMODE_UNKNOWN;
      
      


const LISTMODES_FLAGTABLE =
{ 
    [LISTMODE_SUMMARY]          : F_LISTMODE_SUMMARY,
    [LISTMODE_FILTERED]         : F_LISTMODE_FILTERED,
    [LISTMODE_VERIFIED]         : F_LISTMODE_VERIFIED,
    [LISTMODE_NOT_VERIFIED]     : F_LISTMODE_NOT_VERIFIED,
    [LISTMODE_REUPLOAD_NEEDED]  : F_LISTMODE_REUPLOAD_NEEDED,
    [LISTMODE_FAILED]           : F_LISTMODE_FAILED,
    [LISTMODE_ERROR]            : F_LISTMODE_ERROR,
    [LISTMODE_MISSING]          : F_LISTMODE_MISSING,
    [LISTMODE_PENDING]          : F_LISTMODE_PENDING,
    [LISTMODE_UNKNOWN]          : F_LISTMODE_UNKNOWN,
    [LISTMODE_ALL]              : F_LISTMODE_ALL,
    [LISTMODE_ALL_SEP]          : F_LISTMODE_ALL_SEP,
    [LISTMODE_PROCESSED]        : F_LISTMODE_PROCESSED,
    "STATUS"                    : F_LISTMODE_SUMMARY,
    "NUMERIC"                   : F_NUMERIC,            
};


const LISTMODES_TO_FIELDS_MAP = 
{   
    [F_LISTMODE_PROCESSED]          : "Processed", 
    [F_LISTMODE_FILTERED]           : "Filtered",
    [F_LISTMODE_VERIFIED]           : "Verified",
    [F_LISTMODE_NOT_VERIFIED]       : "Not-Verified",
    [F_LISTMODE_REUPLOAD_NEEDED]    : "Reupload-Needed",
    [F_LISTMODE_FAILED]             : "Failed",    
    [F_LISTMODE_ERROR]              : "Error",    
    [F_LISTMODE_MISSING]            : "Missing",
    [F_LISTMODE_PENDING]            : "Pending",
    [F_LISTMODE_UNKNOWN]            : "Unknown",  
}



const SUBCOMMANDS = 
{
    "files": Handler_Uploads,    
};


const ANSI_ERROR     = "\033[31m";
const ANSI_PENDING   = "\033[33m";
const ANSI_CLEAR     = "\033[0m";
const ANSI_UNDERLINE = "\033[4m";






function Help (args)
{
    Sys.INFO ("VERIFY USAGE");
    Sys.INFO ("------------");
    Sys.INFO ("");
    Sys.INFO ("Verify upload success:")
    Sys.INFO ("   verify files <Drive-ID> [OUTPUT] (NUMERIC) [PARAMS]");
    Sys.INFO ("");
    Sys.INFO ("'OUTPUT' is optional and can be any combination of following:");
    Sys.INFO ("   summary,ok,not-ok,failed,missing,pending,unknown,all,all-separate,filtered,processed");
    Sys.INFO ("");
    Sys.INFO ("'all' lists all files matching the filter in one go, while 'all-separate'");
    Sys.INFO ("outputs separate lists for healthy, failed, missing and unknown.");
    Sys.INFO ("'processed' gives a list of all encountered files, even those that don't");
    Sys.INFO ("match the extension filter. ");
    Sys.INFO ("");
    Sys.INFO ("Optional parameter: 'EXTENSION ext' - filter processed files by extension.");
    Sys.INFO ("The extension-filter is case-sensitive.");
    Sys.INFO ("");
    Sys.INFO ("'NUMERIC' mode is designed to be used with numbered filenames,")
    Sys.INFO ("listing missing files along with the regular output.")
    Sys.INFO ("")
    Sys.INFO ("'RANGE first-last' is an optional parameter for this mode.");
    Sys.INFO ("If omitted, the range is autodetected.");

    
    Sys.INFO ("");
    Sys.INFO ("EXAMPLES:")
    Sys.INFO ("   verify files a44482fd-592e-45fa-a08a-e526c31b87f1 summary,failed");
    Sys.INFO ("   verify files <NFT-drive-id> numeric");
    Sys.INFO ("   verify files <NFT-drive-id> numeric range 1-1000 extension jpg");
    Sys.INFO ("   verify files <NFT-drive-id> numeric");
    Sys.INFO ("");
    Sys.INFO ("");
    Sys.INFO (Sys.ANSI (ANSI_UNDERLINE) + "Private drives are not yet supported!" + Sys.ANSI (ANSI_CLEAR));
}




class Results
{
    Sorted = false;

    FileLists = 
    {
        Processed         : [],
        Filtered          : [],
        Verified          : [],
        "Not-Verified"    : [],
        "Reupload-Needed" : [],
        Failed            : [],
        Error             : [],
        Pending           : [],
        Missing           : [],
        Unknown           : [],        
    };

    
    Numeric = null;

    Summary = {};


    Add (file, filter_ext)
    {    
        this.FileLists.Processed.push (file);        

        if (filter_ext == null || file.Filename == null || file.Filename?.endsWith (filter_ext) )
        {            
            this.FileLists.Filtered.push (file);
            if (file.Error) this.FileLists.Error.push (file);

            if (file.Healthy) 
                this.FileLists.Verified.push (file);

            else
            {
                this.FileLists['Not-Verified'].push (file);

                if (file.Failed || file.Missing)
                    this.FileLists['Reupload-Needed'].push (file);

                if (file.Error || file.Pending)
                    this.FileLists.Unknown.push (file);
            }
                
                 if (file.Failed)                this.FileLists.Failed    .push (file);
            else if (file.Pending)               this.FileLists.Pending   .push (file);
            else if (file.Missing)               this.FileLists.Missing   .push (file);                        
        }

        

    }

    CreateSummary ()
    {
        for (const e of Object.entries (this.FileLists) )
        {
            if (e[1] != null)
                this.Summary[e[0]] = e[1].length;
        }
    }
}







async function HandleCommand (args)
{
    if ( ! args.RequireAmount (1, "A subcommand is required. Valid ones: " + Util.KeysToStr (SUBCOMMANDS) ) )
        return false; 

    const target  = args.Pop ();
    const handler = SUBCOMMANDS[target.toLowerCase () ];

    // Invoke handler if found
    if (handler != null)
    {
        Sys.VERBOSE ("Invoking subcommand-handler for '" + target + "'...", "VERIFY");
        const ret = await handler (args);
        return ret;
    }

    else
        return Sys.ERR ("Unknown command '" + target + "'. Available commands: " + Util.KeysToStr (SUBCOMMANDS) );
    
}






async function Handler_Uploads (args)
{    

    if ( ! args.RequireAmount (1, "Drive-ID required.") )
        return false; 

    const start_time = new Date ().getTime ();
    Sys.VERBOSE ("Operation started at " + Util.GetDate () );



    // Prepare variables
    const drive_id    = args.Pop ();
    let numeric_mode  = false;
    let list_mode     = null;    
    let first         = -1;
    let last          = -1;
    let extension     = null;
    const req_delay   = Settings.Config.ConcurrentDelay_ms;
    

    Sys.VERBOSE ("Concurrent delay: " + req_delay + "ms, Retries: " + Settings.Config.ErrorRetries + ", Retry delay: "
                    + Settings.Config.ErrorWaitDelay_ms + "ms.")

    let arg;
    while (args.HasNext () )
    {
        switch ( (arg = args.PopUC ()) )
        {
            case "NUMERIC":
                numeric_mode = true;
                break;

            case "RANGE":
                if ( ! args.RequireAmount (1, "first-last required, ie. 0-999 . Omit RANGE for autodetection.") )
                    return false; 

                let split = args.Pop ().split ("-");

                if (split?.length != 2 || isNaN (first = split[0]) || isNaN (last = split[1]) )
                    return Sys.ERR_ABORT ("RANGE needs to be in format of 'first-last'.");

                Sys.INFO ("Manual numbered filename range set to " + first + " - " + last);
                break;

            case "EXTENSION":
                if ( ! args.RequireAmount (1, "File-extension required, ie. jpg") )
                    return false; 

                extension = args.PopLC ();

                // Add the dot if it's omitted.
                if (!extension.includes (".") ) 
                    extension = "." + extension;

                Sys.INFO ("Extension filter set to " + extension);
                break;

        
            default:
                list_mode = arg;
        }
    }

    // Autoset listmode
    if (list_mode == null)
    {
        list_mode = numeric_mode ? Settings.Config.VerifyDefaultFlags_Num : Settings.Config.VerifyDefaultFlags;
        Sys.VERBOSE ("Autoset list mode to '" + list_mode + "'.");
    }

    // Extract flags
    const listmode_flags = Util.StrToFlags    (list_mode, LISTMODES_FLAGTABLE);
    Sys.DEBUG ("List mode -flags: " + listmode_flags);

    if (listmode_flags <= 0)
        return Sys.ERR_ABORT ("Unknown list mode '" + list_mode + "'. Valid modes: " + Util.KeysToStr (LISTMODES_VALID) );

    // Allow numeric mode to be enabled in the flags as well.
    if ( (listmode_flags & F_NUMERIC) != 0)
        numeric_mode = true;


    // See if we need numeric mode
    if (!numeric_mode && ( (listmode_flags & F_LISTMODE_MISSING) != 0 || (first != -1 || last != -1) )   )
    {
        numeric_mode = true;
        Sys.VERBOSE ("Autoset numeric mode on.");
    }

    // Extract drive owner
    const owner = await ArFS.GetDriveOwner (drive_id);
    
    if (owner == null && ! Sys.ERR_OVERRIDABLE ("Unable to fetch owner for drive " + drive_id + " .") )        
        return false;








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
        return Sys.ERR_ABORT ("Could not find any transactions from Arweave-address " + owner);
        

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
        return Sys.ERR_ABORT ("No ArFS-metadata transactions found on " + owner + " .");
        







    // Process
    const files_by_id      = {};
    const verifyqueue      = [];

    const Results_All      = new Results ();
    let   Results_Numeric;
    let   results          = Results_All;   
    
    
    

    Sys.INFO ("Starting to process " + (metadata_amount > 1 ? metadata_amount + " metadata-transactions.." 
                                                            : "one metadata-transaction... Shouldn't take long..") );

    let f_id, file;

    

    Sys.Info ("Operation expected to take approx. " + (metadata_amount * req_delay / 1000) + " seconds.");

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
            
            await Util.Delay (req_delay);            
        }
    }


    // Await for all
    for (const p of verifyqueue)
    {
        file = await p;
        Results_All.Add (file);        
    }
    const proc_amount = Results_All.FileLists.Processed.length;



    Sys.INFO ( (proc_amount > 1 ? proc_amount + " files processed" : proc_amount <= 0 ? "Zero (or less) files processed" : "Only one file processed") );
                
    if (proc_amount == 1)
        Sys.INFO ("Must be an important one.. A treasured memento of a belowed one or a piece of one's soul, I wonder..");
    



    // Generate a numbered list if requested
    if (numeric_mode)
    {
        Results_Numeric        = GenerateNumericList (Results_All, first, last, extension);
        Results_Numeric.Sorted = true; 
        results                = Results_Numeric;
    }



    // Generate a summary
    results.CreateSummary ();
    

    
    // Output results
    if ( (listmode_flags & F_LISTMODE_SUMMARY) != 0)
        Sys.OUT_OBJ (results.Summary);

    
    let captions_displayed = false;

    for (const f of Object.entries (LISTMODES_TO_FIELDS_MAP) )
    {
        const mask  = f[0];
        const field = f[1];
        
        if ( (listmode_flags & mask) != 0 && results.FileLists[field]?.length > 0)
        {
            if (!captions_displayed)
            {
                Sys.OUT_TXT ("Filename,State,FileID,MetaTXID,MetaState,DataTXID,DataState,Details");
                captions_displayed = true;
            }
            DisplayResults (results.FileLists[field], !results.Sorted);
        }
        
    }
    







    const after        = new Date ();
    const duration_sec = (after.getTime () - start_time) / 1000;    
    Sys.VERBOSE ("Operation ended at " + Util.GetDate () + ". Time taken: " + duration_sec + " sec.");

    return true;
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
    
    // TODO: Should turn these into one variable at some point.
    Analyzed       = false;
    Healthy        = false;
    Pending        = false;
    Failed         = false;
    Missing        = false;
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
        this.FileID   = f_id;
        this.MetaTXID = tx_entry != null ? tx_entry.GetTXID () : null;        
    }


    static CreateMissing (filename)
    {
        const f = new File (null, null);

        f.Analyzed       = true;
        f.Healthy        = false;
        f.Pending        = false;
        f.Failed         = false;
        f.Missing        = true;
        f.Error          = false;

        f.Filename   = filename;
        f.StatusText = "MISS";
        f.MetaOK     = false;
        f.DataOK     = false;
        f.MetaText   = " - ";
        f.DataText   = " - ";

        return f;
    }


    ResetStatus ()
    {
        this.Error          = false;
        this.Healthy        = false;
        this.Analyzed       = false;
        this.Pending        = false;
        this.Failed         = false;
        this.Missing        = false;
        this.MetaOK         = false;
        this.DataOK         = false;
        this.StatusText     = "???"
        this.MetaText       = null;
        this.DataText       = null;
        this.DetailedStatus = null; 
    }


    async Verify (tx_table)
    {
        const tries_max       = Settings.Config.ErrorRetries;
        let   tries_remaining = Config.Settings.ErrorWa;
        
        while (tries_remaining > 0)
        {
            await this._DoVerify (tx_table);
        
            if (this.Analyzed)
                return this;

            else
            {            
                --tries_remaining;
                await Util.Delay (Settings.Config.ErrorWaitDelay_ms);
            }
        }

        Sys.ERR ("Could not analyze file " + this.FileID + " in " + tries_max + " attempts. Giving up.");
        this.Healthy = false;
        this.Error   = true;
        return this;
    }



    async _DoVerify (tx_table)
    {

        this.ResetStatus ();

        if (this.MetaTXID == null)
        {
            this.Error          = true;
            this.StatusText     = "ERR";
            this.MetaText       = "ERR";
            this.DataText       = " - ";
            this.DetailedStatus = "PROGRAM ERROR: MetaTXID not set.";

            return this;
        }


        // Fetch the metadata JSON
        const arfs_meta = await Arweave.GetTxStrData (this.MetaTXID);

        if (arfs_meta == null)
        {
            this.Error          = true;
            this.StatusText     = "ERR";
            this.MetaText       = "ERR";
            this.DataText       = " - ";
            this.DetailedStatus = "Could not download JSON-metadata.";                        
        }

        else
        {                            
            const json = await JSON.parse (arfs_meta);

            if (json == null)
            {                
                this.Error          = true;
                this.StatusText     = "ERR";
                this.MetaText       = "ERR";
                this.DataText       = " - ";
                this.DetailedStatus = "Could not parse JSON-metadata.";                
            }

            else
            {                
                this.Filename    = json.name;
                this.DataTXID    = json.dataTxId;            
                
                // This shouldn't really happen
                if (tx_table[this.MetaTXID] == null)
                {
                    this.StatusText     = "ERR";
                    this.MetaText       = "ERR";
                    this.MetaOK         = false;                    
                    this.DetailedStatus = "PROGRAM ERROR: MetaTXID " + this.MetaTXID + " not present in tx_table."
                }

                else
                {
                    this.Analyzed = true;
                    
                    if (tx_table[this.MetaTXID]?.IsMined () )
                    {
                        this.MetaOK   = true;
                        this.MetaText = " OK ";
                    }
                    else
                    {
                        this.MetaOK     = false;
                        this.StatusText = "PEND";
                        this.MetaText   = "PEND";
                        this.Pending    = true;
                    }


                    const data_entry = tx_table[this.DataTXID];

                    if (data_entry == null)
                    {
                        this.Failed         = true;
                        this.StatusText     = "FAIL";                    
                        this.DataText       = "FAIL";
                        this.DetailedStatus = "Data-transaction doesn't seem to exist.";
                    }

                    else
                    {
                        if (data_entry.IsMined () )
                        {
                            this.DataOK     = true;
                            this.DataText   = " OK ";                        
                        }
                        else
                        {
                            this.DataOK     = false;
                            this.StatusText = "PEND";
                            this.DataText   = "PEND";
                            this.Pending    = true;
                        }                                  
                    }
                }

            }
           
        }
  
        // Set result
        this.Healthy    = this.MetaOK && this.DataOK;

        if      (this.Healthy) this.StatusText = "OK";
        else if (this.Fail)    this.StatusText = "FAIL";
        else if (this.Error)   this.StatusText = "ERR";        
        else if (this.Pending) this.StatusText = "PEND";
        
        if (this.Healthy)
            this.DetailedStatus = null;

        
        if (Settings.IsVerbose () )
            Sys.VERBOSE (this.toString () );

        return this;
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




function GenerateNumericList (all_results, min = -1, max = -1, filter_ext)
{
    const results   = new Results ();
    results.Numeric = [];


    // Find the limits.
    let   num;
    const filetable = {};

    const auto_min  = min == -1;
    const auto_max  = max == -1;
    
    
    for (const fn of all_results.FileLists.Processed)
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

            else if (filetable[num].Healthy == false && (fn.Healthy == true || (filetable[num].Pending == false && fn.Pending == true) ) )
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
        return results;
    }

    else if (auto_min || auto_max) 
        Sys.INFO ("Auto-set range to " + min + " - " + max + " .");


    let file;

    // TODO pre-alloc?  
    for (let C = min; C <= max; ++C)
    {
        file = filetable[C] != null ? filetable[C] : File.CreateMissing (`${C}` + (filter_ext != null ? filter_ext : "") );
        
        results.Numeric.push (file);
        results.Add (file, filter_ext);
    }

    results.Summary["Range"] = min + "-" + max;

    return results;
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
        return Sys.ERR_ABORT ("Unknown list mode '" + list_mode + "'. Valid modes: " + LISTMODES_VALID );

    const owner          = await ArFS.GetDriveOwner (drive_id);
    
    if (owner == null && ! Sys.ERR_OVERRIDABLE ("Unable to fetch owner for drive " + drive_id + " .") )
        return false;
       
    
    




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
        

    if ( (listmode_flags & F_LISTMODE_OK) != 0)
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