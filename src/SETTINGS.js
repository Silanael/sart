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
const SARTBase      = require ("./SARTBase");
const LOGLEVELS     = Constants.LOGLEVELS;
const OUTPUTDESTS   = Constants.OUTPUTDESTS;
const OUTPUTFORMATS = Constants.OUTPUTFORMATS;


class SettingDef extends SARTBase
{    
    DefaultValue = null;
    ReadOnly     = false;
    Deprecated   = false; 
    RuntimeOnly  = false;


    constructor (args = {name: null} )
    { 
        super (args);        
    }


    DV               (value) { this.DefaultValue = value; return this;      }       
    RO               ()      { this.ReadOnly     = true;  return this;      }
    DEPR             ()      { this.Deprecated   = true;  return this;      }
    NOCONF           ()      { this.RuntimeOnly  = true;  return this;      }
    
    GetKey           ()      { return this.Name;                            }
    GetDefaultValue  ()      { return this.DefaultValue;                    }
    CanBeModified    ()      { return !this.ReadOnly;                       }
    IsValid          ()      { return !this.Deprecated;                     }
    CanBeCopied      ()      { return !this.RuntimeOnly && this.IsValid (); }

}



const SETTINGS =
{
    ObjectType              : new SettingDef ().WithName ("ObjectType")               .DV ("SARTConfig").RO (),
    Description             : new SettingDef ().WithName ("Description")              .DV ("SART configuration"),
    ConfigVersion           : new SettingDef ().WithName ("ConfigVersion")            .DV (Constants.CONFIG_VERSION).RO (),
    AppVersion              : new SettingDef ().WithName ("AppVersion")               .DV (Package.version).RO (),
    AppVersionCode          : new SettingDef ().WithName ("AppVersionCode")           .DV (Package.versioncode).RO (),
    LogLevel                : new SettingDef ().WithName ("LogLevel")                 .DV (Constants.IS_TTY ? LOGLEVELS.MSG : LOGLEVELS.NOMSG),
    MsgOut                  : new SettingDef ().WithName ("MsgOut")                   .DV (OUTPUTDESTS.STDOUT),
    ErrOut                  : new SettingDef ().WithName ("ErrOut")                   .DV (OUTPUTDESTS.STDERR),
    ArweaveHost             : new SettingDef ().WithName ("ArweaveHost")              .DV ("arweave.net"),
    ArweavePort             : new SettingDef ().WithName ("ArweavePort")              .DV (443),
    ArweaveProto            : new SettingDef ().WithName ("ArweaveProto")             .DV ("https"),
    ArweaveTimeout_ms       : new SettingDef ().WithName ("ArweaveTimeout_ms")        .DV (100000),    
    Recursive               : new SettingDef ().WithName ("Recursive")                .DV (false),
    DisplayAll              : new SettingDef ().WithName ("DisplayAll")               .DV (false),
    AllowWildcards          : new SettingDef ().WithName ("AllowWildcards")           .DV (true),
    ConcurrentDelay_ms      : new SettingDef ().WithName ("ConcurrentDelay_ms")       .DV (200).DEPR (),
    ErrorWaitDelay_ms       : new SettingDef ().WithName ("ErrorWaitDelay_ms")        .DV (5000),
    ErrorWaitVariationP     : new SettingDef ().WithName ("ErrorWaitVariationP")      .DV (1.0),
    ErrorRetries            : new SettingDef ().WithName ("ErrorRetries")             .DV (3),
    MaxAsyncCalls           : new SettingDef ().WithName ("MaxAsyncCalls")            .DV (100),
    MaxConcurrentFetches    : new SettingDef ().WithName ("MaxConcurrentFetches")     .DV (5),
    OutputFilename          : new SettingDef ().WithName ("OutputFilename")           .DV (null).NOCONF (),
    OutputFormat            : new SettingDef ().WithName ("OutputFormat")             .DV (OUTPUTFORMATS.TXT),
    OutputFileDest          : new SettingDef ().WithName ("OutputFileDest")           .DV (null).NOCONF (),    
    OutputListMode          : new SettingDef ().WithName ("OutputListMode")           .DV (null).NOCONF (),
    OutputFields            : new SettingDef ().WithName ("OutputFields")             .DV (null).NOCONF (),    
    OutputFieldsCaseSens    : new SettingDef ().WithName ("OutputFieldsCaseSens")     .DV (false),
    SizeDigits              : new SettingDef ().WithName ("SizeDigits")               .DV (5),
    VarNamesUppercase       : new SettingDef ().WithName ("VarNamesUppercase")        .DV (false),
    ANSIAllowed             : new SettingDef ().WithName ("ANSIAllowed")              .DV (true),
    DuplicateTagsAllowed    : new SettingDef ().WithName ("DuplicateTagsAllowed")     .DV (false),
    CSVReplacePeriodWith    : new SettingDef ().WithName ("CSVReplacePeriodWith")     .DV ("#!#"),
    JSONSpacing             : new SettingDef ().WithName ("JSONSpacing")              .DV (3),
    MultiInputSeparatorChr  : new SettingDef ().WithName ("MultiInputSeparatorChr")   .DV (","),
    VerifyDefaults          : new SettingDef ().WithName ("VerifyDefaults")           .DV ("SUMMARY,NOT-VERIFIED"),
    VerifyDefaults_Numeric  : new SettingDef ().WithName ("VerifyDefaults_Numeric")   .DV ("SUMMARY,ALL"),
    ArFSEntityTryOrder      : new SettingDef ().WithName ("ArFSEntityTryOrder")       .DV ("drive,file,folder"),
    QueryMinBlockHeight     : new SettingDef ().WithName ("QueryMinBlockHeight")      .DV (null),
    QueryMaxBlockHeight     : new SettingDef ().WithName ("QueryMaxBlockHeight")      .DV (null),
    IncludeInvalidTX        : new SettingDef ().WithName ("IncludeInvalidTX")         .DV (false),
    DirectTXPostMaxDataSize : new SettingDef ().WithName ("DirectTXPostMaxDataSize")  .DV (256 * 1024),
    Force                   : new SettingDef ().WithName ("Force")                    .DV (false),
    MaxArFSMetadataSize     : new SettingDef ().WithName ("MaxArFSMetadataSize")      .DV (1073741824), // 1MB ought to be enough for anybody?
    MaxTXFormat             : new SettingDef ().WithName ("MaxTXFormat")              .DV (2),
    MinArFSVersion          : new SettingDef ().WithName ("MinArFSVersion")           .DV (0.11),
    MaxArFSVersion          : new SettingDef ().WithName ("MaxArFSVersion")           .DV (0.11),
    ArFSQueryTagsEnabled    : new SettingDef ().WithName ("ArFSQueryTagsEnabled")     .DV (false),
    ArFSTXQueryTags         : new SettingDef ().WithName ("ArFSTXQueryTags")          .DV ([ {name:"App-Name", values:["ArDrive","ArDrive-Web","ArDrive-CLI","ArDrive-Desktop","ArDrive-Sync"] } ]),
    SafeConfirmationsMin    : new SettingDef ().WithName ("SafeConfirmationsMin")     .DV (15),
    TXTagsMaxTotalBytes     : new SettingDef ().WithName ("TXTagsMaxTotalBytes")      .DV (Constants.CONFIG_TX_TAGS_TOTAL_SIZE),
    LessFiltersMode         : new SettingDef ().WithName ("LessFiltersMode")          .DV (false),
    ContainerMode           : new SettingDef ().WithName ("ContainerMode")            .DV (false),

    Fields_Transaction_Separate: new SettingDef ("Fields_Transaction_Separate") .DV (null),
    Fields_Transaction_Table   : new SettingDef ("Fields_Transaction_Table")    .DV (null),
    

}
Object.freeze (SETTINGS);



module.exports = { SettingDef, SETTINGS }