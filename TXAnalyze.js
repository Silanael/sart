//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// TXAnalyze.js - 2021-11-02
//

const Util     = require ('./util.js');
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');
const ArFSDefs = require ('./ArFS_DEF.js');
const ZLib     = require('zlib');



class TXResult
{
    App         = null;
    Format      = null;
    Type        = null;
    ID          = null;

    Description = null;
}


class Pattern
{

    Description  = null;
    RequiredTags = [];
    


    Matches (tx, tx_tags_decoded = null)
    { 
        // Fetch and decode tags from the TX if not provided.
        if (tx_tags_decoded == null)
            tx_tags_decoded = Util.DecodeTXTags (tx);


        if (tx_tags_decoded == null)
        {
            Sys.DEBUG (tx);
            return Sys.ERR_ONCE ("Transaction provided has no tags!");
        }
    

        let found = false;
        

        for (const req_tag of this.RequiredTags)
        {            
            // Start with true if we want to NOT have this tag.
            found = req_tag.value == null;

            for (const tx_tag of tx_tags_decoded)
            {                
                if (tx_tag?.name?.match (req_tag.name) && req_tag.value == null)
                {
                    if (Settings.IsVerbose () )      
                        Sys.VERBOSE ("Contains denied tag " + tx_tag.name + ".", this.GetDescription () );

                    found = false;
                    break;
                }

                if (tx_tag?.name?.match (req_tag.name) && tx_tag?.value?.match (req_tag.value) )
                {              
                    if (Settings.IsVerbose () )      
                        Sys.VERBOSE (tx_tag.name + " matches " + this.GetDescription () );

                    found = true;
                    break;
                }
            }
            if (found == false)
                return false;
        }
        
        return found;
    }



    WithRequirement (name_regex, value_regex)
    {
        this.RequiredTags.push ( {name: name_regex, value: value_regex} );
        return this;
    }

    WithRequirementExact (name_regex, value)
    {
        this.RequiredTags.push ( {name: name_regex, value: ("^" + value + "$") } );
        return this;
    }


    WithDescription (description)
    {
        this.Description = description;
        return this;
    }

    GetRequirementsAmount () { return this.RequiredTags.length; }
    GetDescription        () { return this.Description != null ?  this.Description : this.name; }
    
    GetInfo (entry = null, opts = {getcontent: false } )
    {
        const results =
        {
            Description: this.GetDescription (),
            Content:     opts?.getcontent ? this._AnalyzeTxEntry (entry) : null
        }
        return results;
    }

    _AnalyzeTxEntry (entry = null) { return null; }    

}

class Pattern_PathManifest extends Pattern
{
    constructor ()
    {
        super ();
        this.WithRequirementExact ("Content-Type", "application/x.arweave-manifest+json");
        this.WithDescription ("Path manifest");
    }
    
}

class Pattern_SPS extends Pattern
{
    constructor ()
    {
        super ();
        this.WithRequirementExact ("Format", "SILSCP-SPS");
        this.WithDescription ("SILSCP-SPS")
    }

    /* Override */ _AnalyzeTxEntry (entry = null)
    {
        if (entry?.GetTag ("Version") != 1)
            return JSON.parse (ZLib.inflateSync (Buffer.from 
            (
            "eNqFUl1v2jAU/StXkaa+QBSgVBNvXnDAXYiZHcqqMlWBXEjU1JkSp6xq+993DZvU7WHzQ4IP93xdePHu71mihTfxNl0QDLZ3o8Gj1/Om"
            +"LOWEDYPhoD8Y9IMxYQspp4Tdvb6+wvvzDfp/HVgzlYhkRiSecDW7PdPgH8eJwJUfwAcizeXSud8B/JcS+IMTRS79hZw6lk5ZMmWxTDjB"
            +"sa94OFezc5egH3wkMGKrOPVDwtR4BNHVJdlG44E/hGh0SXoqcEGuRwN6fiZ8TJ/H/tC5fLrmYSpuuPYmL7Q6zVTaJ4eV0gR6E9t02POW"
            +"SiyYuqWIE4hlSKsEBnOmFjHXGqKYLVzOiImYT0lU81BSYiJMIBLJFBZ8KkIWA8lyiKQCaiATEQL/OmcrnQqZvOenXKXi5DcBnswUuyE/"
            +"klkqrrmii5arGESSSkjnQsNaqtj9kCKhETmjKU0qX1aUMzmnEEmoONMclnLN1UmMpuRKha74H8Q3+l/Qm81cpVmDaEtzaHuw65qy7lqo"
            +"DfobszHr4hmyBuG57qDABnsg4FibHBv/9L24yGFX4O4BbIGQZxbB1pCjxeaxNHQpMguZyaHInhAyqEprKyQKwcfSFk64B9vOwr5uNsbU"
            +"R3K4qCp4QPxO7LJ1D3OAttsS0YeYLBqK14PSKdDkHu2u+G2fwb6pH4E1RyTDjanNDilyVf9K2H7HXeu8QC+1DxEiCVB9l9pm1cPpTXN1"
            +"Ux5Kk1XwiFDuSaG15LUxeZMdYdtgZguf0Lw2FxbwB6nac1e3KBerR9e6O9BUWmBLjbOqas9bMPiE1LXBtqss5lAa2tDzqSbt1Hv7CWqtFgw="
            , 'base64')));        
            
    }
}



class Pattern_ArFSEntity extends Pattern
{
    constructor () 
    {
        super ();
        this.WithRequirement (ArFSDefs.TAG_ARFS, ".");        
        this.WithDescription ("ArFS-entity");
    }
}

class Pattern_ArFS_TX extends Pattern
{
    constructor () 
    {
        super ();
        this.WithRequirement ("App-Name", ".*ArDrive.*");        
        this.WithDescription ("ArFS-transaction");
    }
}



class Pattern_ArFSFile extends Pattern_ArFSEntity
{
    constructor () 
    {
        super ();
        this.WithRequirement (ArFSDefs.TAG_ENTITYTYPE, ArFSDefs.ENTITYTYPE_FILE);        
        this.WithDescription ("File metadata [ArFS]");
    }    
}

class Pattern_ArFSFolder extends Pattern_ArFSEntity
{
    constructor () 
    {
        super ();
        this.WithRequirement (ArFSDefs.TAG_ENTITYTYPE, ArFSDefs.ENTITYTYPE_FOLDER);        
        this.WithDescription ("Folder metadata [ArFS]");
    }    
}

class Pattern_ArFSDrive extends Pattern_ArFSEntity
{
    constructor (is_public) 
    {
        super ();
        this.WithRequirement (ArFSDefs.TAG_ENTITYTYPE, ArFSDefs.ENTITYTYPE_DRIVE);        
        this.WithRequirement (ArFSDefs.TAG_DRIVEPRIVACY, is_public ? "public" : "private");
        this.WithDescription ((is_public ? "Public" : "Private") + " drive metadata [ArFS]");
    }    
}

class Pattern_ArFSFileData extends Pattern_ArFS_TX
{
    constructor (is_public) 
    {
        super ();
        this.WithRequirement (ArFSDefs.TAG_ENTITYTYPE, ArFSDefs.ENTITYTYPE_FILE);
        this.WithRequirement (ArFSDefs.TAG_CIPHER, is_public ? null : ".*");

        this.WithDescription ((is_public ? "Public" : "Private") + " file [ArFS]");
    }    
}


const PATTERNS =
[
    new Pattern_SPS          (),
    new Pattern_PathManifest (),

    new Pattern_ArFS_TX      (),
    new Pattern_ArFSEntity   (),
    new Pattern_ArFSDrive    (true),
    new Pattern_ArFSDrive    (false),
    new Pattern_ArFSFolder   (),
    new Pattern_ArFSFile     (),
    new Pattern_ArFSFileData (true),
    new Pattern_ArFSFileData (false),

    new Pattern     ().WithRequirement      ("page:url", ".*")         .WithRequirement      ("page:timestamp", ".*")    .WithDescription ("Archived webpage"),
    new Pattern     ().WithRequirementExact ("App-Name", "ArConnect")  .WithRequirementExact ("Type", "Fee-Transaction") .WithDescription ("ArConnect-fee"),
    new Pattern     ().WithRequirementExact ("App-Name", "argora")                                                       .WithDescription ("Argora"),

    /*
    new Pattern     ().WithRequirement ("ArFS", ".*")             .WithRequirement ("Entity-Type", "file")  .WithDescription ("ArFS-file"),
    new Pattern     ().WithRequirement ("ArFS", ".*")             .WithRequirement ("Entity-Type", "folder").WithDescription ("ArFS-folder"),
    new Pattern     ().WithRequirement ("ArFS", ".*")             .WithRequirement ("Entity-Type", "drive") .WithDescription ("ArFS-drive"),
    new Pattern     ().WithRequirement ("App-Name", ".*ArDrive.*").WithRequirement ("Entity-Type", null)
                                                                  .WithRequirement ("Type",        null)
                                                                  .WithDescription ("ArFS-file data"),
    new Pattern     ().WithRequirement ("App-Name", ".*ArDrive.*").WithRequirement ("Type", "fee")          .WithDescription ("ArDrive-fee"),
    new Pattern     ().WithRequirement ("App-Name", ".*ArDrive.*").WithRequirement ("Type", "data upload")  .WithDescription ("ArDrive-fee"),
    new Pattern     ().WithRequirement ("App-Name", ".*ArDrive.*")                                          .WithDescription ("ArDrive"),
    new Pattern     ().WithRequirement ("ArFS", ".*")                                                       .WithDescription ("ArFS"),
    */

    
    
];



function AnalyzeTxEntry (entry, opts = { getcontent: true } )
{
    let str = null;
    let highest_match_reqs = 0;
    let best_match = null;
    let results = { Description: "NO DATA"};
    
    if (entry == null)
        return results;

    const tags = entry.GetTags ();
    
    if (tags != null)
    {                
        let pattern;
        
        let regs_amount;

        const len = PATTERNS.length; 
        for (let C = 0; C < len; ++C)
        {
            pattern     = PATTERNS[C];
            regs_amount = pattern.GetRequirementsAmount ();

            if (pattern.Matches (null, tags) == true && regs_amount >= highest_match_reqs)
            {
                const desc = pattern.GetDescription ();

                if (regs_amount >= highest_match_reqs)
                {
                    highest_match_reqs = regs_amount;
                    best_match         = pattern;
                    str                = desc;
                }

                else if (str != null)
                {
                    Sys.VERBOSE ("Pattern " + desc + " may conflict with " + str + ".", entry.GetTXID () )
                    str += " / " + desc;
                }
                else
                    str = desc;
            
                
            }
        }
    }

    // No pattern matches 
    if (best_match == null)
    {        
        if (entry.HasData () )
        {
            const ctype = entry.GetTag ("Content-Type");
            str = ctype != null ? ctype : "Data"; 
        } 
        if (entry.HasTransfer () ) 
            str = str == null ? "Transfer" : str + " + " + "transfer";

        results =
        {
            Description: (str?.length > 0 ? str : "UNKNOWN")
        }
    }
    else
        results = best_match.GetInfo (entry, opts);

    
    return results;
}


function GetTXEntryDescription (entry, opts)
{
    if (opts == null) 
        opts = {};

    opts.getcontent = false;

    return AnalyzeTxEntry (entry, opts)?.Description;
}


module.exports = { AnalyzeTxEntry, GetTXEntryDescription }