//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CONST_SETTINGS.js - 2021-12-10_01
//
// Settings-definitions and the default config.
//

const Package       = require ("../package.json");
const Constants     = require ("./CONSTANTS");
const LOGLEVELS     = Constants.LOGLEVELS;
const OUTPUTDESTS   = Constants.OUTPUTDESTS;
const OUTPUTFORMATS = Constants.OUTPUTFORMATS;


class Setting
{
    Name         = null;
    DefaultValue = null;
    ReadOnly     = false;
    Deprecated   = false; 
    RuntimeOnly  = false;


    constructor (name)
    { 
        this.Name = name; 
    }


    DV               (value) { this.DefaultValue = value; return this;      }       
    RO               ()      { this.ReadOnly     = true;  return this;      }
    DEPR             ()      { this.Deprecated   = true;  return this;      }
    NOCONF           ()      { this.RuntimeOnly  = true;  return this;      }

    GetName          ()      { return this.Name;                            }
    GetKey           ()      { return this.Name;                            }
    GetDefaultValue  ()      { return this.DefaultValue;                    }
    CanBeModified    ()      { return !this.ReadOnly;                       }
    IsValid          ()      { return !this.Deprecated;                     }
    CanBeCopied      ()      { return !this.RuntimeOnly && this.IsValid (); }

    toString         ()      { return this.Name;                            }

}



const SETTINGS =
{
    ObjectType              : new Setting ("ObjectType")               .DV ("SARTConfig").RO (),
    Description             : new Setting ("Description")              .DV ("SART configuration"),
    ConfigVersion           : new Setting ("ConfigVersion")            .DV (Constants.CONFIG_VERSION).RO (),
    AppVersion              : new Setting ("AppVersion")               .DV (Package.version).RO (),
    AppVersionCode          : new Setting ("AppVersionCode")           .DV (Package.versioncode).RO (),
    LogLevel                : new Setting ("LogLevel")                 .DV (Constants.IS_TTY ? LOGLEVELS.DEBUG : LOGLEVELS.NOMSG),
    MsgOut                  : new Setting ("MsgOut")                   .DV (OUTPUTDESTS.STDOUT),
    ErrOut                  : new Setting ("ErrOut")                   .DV (OUTPUTDESTS.STDERR),
    ArweaveHost             : new Setting ("ArweaveHost")              .DV ("arweave.net"),
    ArweavePort             : new Setting ("ArweavePort")              .DV (443),
    ArweaveProto            : new Setting ("ArweaveProto")             .DV ("https"),
    ArweaveTimeout_ms       : new Setting ("ArweaveTimeout_ms")        .DV (100000),    
    Recursive               : new Setting ("Recursive")                .DV (false),
    DisplayAll              : new Setting ("DisplayAll")               .DV (false),
    AllowWildcards          : new Setting ("AllowWildcards")           .DV (true),
    ConcurrentDelay_ms      : new Setting ("ConcurrentDelay_ms")       .DV (200).DEPR (),
    ErrorWaitDelay_ms       : new Setting ("ErrorWaitDelay_ms")        .DV (5000),
    ErrorWaitVariationP     : new Setting ("ErrorWaitVariationP")      .DV (1.0),
    ErrorRetries            : new Setting ("ErrorRetries")             .DV (3),
    MaxConcurrentFetches    : new Setting ("MaxConcurrentFetches")     .DV (5),
    OutputFilename          : new Setting ("OutputFilename")           .DV (null).NOCONF (),
    OutputFormat            : new Setting ("OutputFormat")             .DV (OUTPUTFORMATS.TXT),
    OutputFileDest          : new Setting ("OutputFileDest")           .DV (null).NOCONF (),    
    OutputAsTable           : new Setting ("OutputAsTable")            .DV (null), // null = auto.
    OutputFields            : new Setting ("OutputFields")             .DV (null).NOCONF (),    
    OutputFieldsCaseSens    : new Setting ("OutputFieldsCaseSens")     .DV (false),
    SizeDigits              : new Setting ("SizeDigits")               .DV (5),
    VarNamesUppercase       : new Setting ("VarNamesUppercase")        .DV (false),
    ANSIAllowed             : new Setting ("ANSIAllowed")              .DV (true),
    DuplicateTagsAllowed    : new Setting ("DuplicateTagsAllowed")     .DV (false),
    CSVReplacePeriodWith    : new Setting ("CSVReplacePeriodWith")     .DV ("#!#"),
    JSONSpacing             : new Setting ("JSONSpacing")              .DV (3),
    MultiInputSeparatorChr  : new Setting ("MultiInputSeparatorChr")   .DV (","),
    VerifyDefaults          : new Setting ("VerifyDefaults")           .DV ("SUMMARY,NOT-VERIFIED"),
    VerifyDefaults_Numeric  : new Setting ("VerifyDefaults_Numeric")   .DV ("SUMMARY,ALL"),
    ArFSEntityTryOrder      : new Setting ("ArFSEntityTryOrder")       .DV ("drive,file,folder"),
    QueryMinBlockHeight     : new Setting ("QueryMinBlockHeight")      .DV (null),
    QueryMaxBlockHeight     : new Setting ("QueryMaxBlockHeight")      .DV (null),
    IncludeInvalidTX        : new Setting ("IncludeInvalidTX")         .DV (false),
    Force                   : new Setting ("Force")                    .DV (false),
    MaxArFSMetadataSize     : new Setting ("MaxArFSMetadataSize")      .DV (1073741824), // 1MB ought to be enough for anybody?
    MaxTXFormat             : new Setting ("MaxTXFormat")              .DV (2),
    MinArFSVersion          : new Setting ("MinArFSVersion")           .DV (0.11),
    MaxArFSVersion          : new Setting ("MaxArFSVersion")           .DV (0.11),
    ArFSQueryTagsEnabled    : new Setting ("ArFSQueryTagsEnabled")     .DV (false),
    ArFSTXQueryTags         : new Setting ("ArFSTXQueryTags")          .DV ([ {name:"App-Name", values:["ArDrive","ArDrive-Web","ArDrive-CLI","ArDrive-Desktop","ArDrive-Sync"] } ]),
    SafeConfirmationsMin    : new Setting ("SafeConfirmationsMin")     .DV (15),
    TXTagsMaxTotalBytes     : new Setting ("TXTagsMaxTotalBytes")      .DV (Constants.CONFIG_TX_TAGS_TOTAL_SIZE),
    LessFiltersMode         : new Setting ("LessFiltersMode")          .DV (false),
    ContainerMode           : new Setting ("ContainerMode")            .DV (false),

    Fields_Transaction_Table  : new Setting ("Fields_Transaction_Table")   .DV (null),
    Fields_Transaction_Entries: new Setting ("Fields_Transaction_Entries") .DV (null),

}
Object.freeze (SETTINGS);



module.exports = { Setting, SETTINGS }