//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// TXAnalyze.js - 2021-11-02
//

const Util = require ('./util.js');
const Sys  = require ('./sys.js');


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
    
    Matches (tx, tags_decoded = null)
    { 
        if (tags_decoded == null)
            tags_decoded = Util.DecodeTXTags (tx);

        if (tags_decoded == null)
            return Sys.ERR_ONCE ("Pattern has no tags!");

        const tags_amount = tags_decoded.length;

        const len = this.RequiredTags.length;
        let tag, found;
        for (let C = 0; C < len; ++C)
        {
            found = false;
            tag = this.RequiredTags[C];
            for (let T = 0; T < tags_amount; ++T)
            {
                if (tags_decoded.name?.matches (tag.name) && tags.decoded.value?.matches (tag.value) )
                {
                    found = true;
                    break;
                }
            }
            if (!found)
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

    _GetTxResult (tx, tags = null) { }

}


class Pattern_ArFSEntity extends Pattern
{
    constructor () 
    {
        this.WithRequirement ("ArFS", ".");        
    }
}


class Pattern_ArFSFile extends Pattern_ArFSEntity ()
{
    constructor () 
    {
        this.AddRequirement ("Entity-Type", "file");
    }    
}


PATTERNS =
[
    new Pattern ().WithRequirement ("ArFS", ".*")             .WithRequirement ("Entity-Type", "file")  .WithDescription ("ArFS file entity"),
    new Pattern ().WithRequirement ("ArFS", ".*")             .WithRequirement ("Entity-Type", "folder").WithDescription ("ArFS folder entity"),
    new Pattern ().WithRequirement ("ArFS", ".*")             .WithRequirement ("Entity-Type", "drive") .WithDescription ("ArFS drive entity"),
    new Pattern ().WithRequirement ("App-Name", ".*ArDrive.*").WithRequirement ("Entity-Type", "file")  .WithDescription ("ArFS file data"),
    new Pattern ().WithRequirement ("App-Name", ".*ArDrive.*").WithRequirement ("Type", "fee")          .WithDescription ("ArDrive fee"),
];

function AnalyzeTx (tx)
{
    


}