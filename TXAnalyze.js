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

        if (tx_tags_decoded == null || tx_tags_decoded.length <= 0)
            return Sys.ERR_ONCE ("Transaction provided has no tags!");
    

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

    WithDescription (description)
    {
        this.Description = description;
        return this;
    }

    GetRequirementsAmount () { return this.RequiredTags.length; }
    GetDescription        () { return this.Description != null ?  this.Description : this.name; }

    _GetTxResult (tx, tags = null) { }

}


class Pattern_ArFSEntity extends Pattern
{
    constructor () 
    {
        this.WithRequirement ("ArFS", ".");        
    }
}


class Pattern_ArFSFile extends Pattern_ArFSEntity
{
    constructor () 
    {
        this.AddRequirement ("Entity-Type", "file");
    }    
}


const PATTERNS =
[
    new Pattern ().WithRequirement ("ArFS", ".*")             .WithRequirement ("Entity-Type", "file")  .WithDescription ("ArFS-file"),
    new Pattern ().WithRequirement ("ArFS", ".*")             .WithRequirement ("Entity-Type", "folder").WithDescription ("ArFS-folder"),
    new Pattern ().WithRequirement ("ArFS", ".*")             .WithRequirement ("Entity-Type", "drive") .WithDescription ("ArFS-drive"),
    new Pattern ().WithRequirement ("App-Name", ".*ArDrive.*").WithRequirement ("Entity-Type", null)
                                                              .WithRequirement ("Type",        null)
                                                              .WithDescription ("ArFS-file data"),
    new Pattern ().WithRequirement ("App-Name", ".*ArDrive.*").WithRequirement ("Type", "fee")          .WithDescription ("ArDrive-fee"),
    new Pattern ().WithRequirement ("App-Name", ".*ArDrive.*").WithRequirement ("Type", "data upload")  .WithDescription ("ArDrive-fee"),
    new Pattern ().WithRequirement ("App-Name", ".*ArDrive.*")                                          .WithDescription ("ArDrive"),
    new Pattern ().WithRequirement ("ArFS", ".*")                                                       .WithDescription ("ArFS"),

    new Pattern ().WithRequirement ("page:url", ".*")         .WithRequirement ("page:timestamp", ".*") .WithDescription ("Archived webpage"),
];


function AnalyzeTxEntry (entry)
{
    let str = null;
    let highest_match_reqs = 0;

    const tags = entry.GetTags ();
    
    if (tags != null)
    {        
        let best_match = null;
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
    if (str == null)
    {
        if (entry.HasData () )
        {
            const ctype = entry.GetTag ("Content-Type");
            str = ctype != null ? ctype : "Data"; 
        } 
        if (entry.HasTransfer () ) str = str == null ? "Transfer" : str + " + " + "transfer";
    }
    
    return str != null ? str : "UNKNOWN";
}



module.exports = { AnalyzeTxEntry }