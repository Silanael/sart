# SART (Silanael ARweave Tool)
(C) Silanael 2021




## VERSION 0.8.5 ALPHA
This is a pre-release version that is **NOT INTENDED FOR PRODUCTION!**

It exists in order to provide a fallback and point of comparison for
the LIST-command output before I start optimizing the queries.

This version focuses on the VERIFY-functionality, which was designed to produce
a CSV containing data of files that were successfully uploaded along with failed
and missing ones during these times of network congestion. At the time of
writing this, ArDrive's error-tolerance and recovery capabilities are virtually
non-existent, prompting the creation of SART.

The VERIFY-functionality is consider operational and optimized, using
concurrent asynchronous fetched whereas LIST does not yet use this kind of
approach, being slow as hell - as such, it should not be used in this version.

!!! THIS IS STILL A WORK IN PROGRESS !!!
**THE DATA PROVIDED BY THIS VERSION MAY NOT BE FULLY ACCURATE**

Furthermore, the commands, parameters and the structure of data output
are not yet established and are subject to change.

The binary executables provided have been created with [pkg](https://www.npmjs.com/package/pkg)
and as such, I cannot be certain that they are devoid of malicious/harmful code.
This is probably not the case, but use at your own risk still.



## PROGRAM DESCRIPTION
**SART** is an utility primarily designed to extract data from the Arweave-network,
able to create ArFS-listings in CSV-form containing information about the files
such as Filenames mapped to TXIDs, being a successor to **ardrive-get-files**.

It's also able to verify uploaded files and show the missing ones for uploads
that contain numeric filenames (ie. 1.png, 2.png etc.).

Transaction creating functionality is also planned, allowing users to create
custom transactions, fix broken ArDrives and generate path manifests
in the near future.

SART may be operated via command-line parameters, or from a console interface
that launches by default if no command is given.

Though it's in GitHub, this is my hobby project. 
**Pull requests are currently NOT accepted**.



## THINGS TO BE MINDFUL OF
- LIST is extremely slow with ArFS-drives/paths. It is purposely left that way
  for this version in order to provide a good known to compare listings against
  when I do optimize it. Use VERIFY to verify and generate lists of drive content.

- ArFS-entities made with future ArDrive-software may not show up if it continues
  the idiotic convention of having a different App-Name -tag for each client.
  Currently there exists no solid way of identifying ArFS-transactions as not
  even the presence of the ArFS-tag is guaranteed. If more App-Name -variations
  are added, they can be appended to `Config.ArFSTXQueryTags`, or alternatively
  the option `--less-filters` can be used to completely remove the identifying
  requirements (this leaves queries with things like `Entity-Type=drive` and
  `Drive-Id=<id>`). Using this option may produce false entries and errors
  if any other software uses the same tags as ArFS.
  **Currently the VERIFY-functionality ignores this and seeks for metadata
   transactions containing an `ArFS`-tag**.

- This version uses a fixed concurrent delay of 200ms. Dropping it to 50ms gives
  faster VERIFY-listings but is too fast for some Internet-connections. 
  If you're getting errors in VERIFY-listings, try increasing concurrent interval,
  ie. `--concurrent-ms 300`, or to 500 or more. This increases the time to verify
  the files but makes things work for bad connections.
- Redirect-to-file (">") cannot yet be used from within the internal console.



## PREREQUISITES (IF BUILDING FROM SOURCE)
- Install [node.js](https://nodejs.org/)



## TO BUILD
- `git clone https://github.com/Silanael/sart.git`
- `cd sart`
- `npm install`



## TO RUN FROM SOURCE
- `./sart` OR `npm start` OR `node main.js`



## USAGE
- `sart [COMMAND] [CMD-ARGS] [OPTIONS...]`
- `sart --help` to display help.
- `sart --help [COMMAND]` to learn more of the command in question.
- Running with no command starts the console interface.



## USAGE EXAMPLES

### Generate a list of successfully uploaded files with a summary
- `sart verify files <drive-id> summary,verified --verbose-stderr > verified.csv`

### Generate a list of files that may need to be reuploaded
- `sart verify files <drive-id> not-verified --verbose-stderr > not-verified.csv`

### Generate a list of just failed files
- `sart verify files <drive-id> failed --verbose-stderr > failed.csv`

### Generate a list for NFT-uploads
- `sart verify files <drive-id> numeric all --verbose-stderr > numeric-all.csv`

### Generate a list of failed, missing and uncertain files for NFT-uploads
- `sart verify files <drive-id> numeric not-verified --verbose-stderr > numeric-not-verified.csv`

### Generate a list of files that very likely need to be re-uploaded for NFT-uploads
- `sart verify files <drive-id> numeric upload-needed --verbose-stderr > numeric-upload-needed.csv`

### Generate a list for NFT-uploads for specific range and file extension (PNG)
- `sart verify files <drive-id> numeric all range 1-1000 extension png --verbose-stderr > numeric-range.csv`



## COMMANDS

### Generic
Command | Alt    | Description
--------|--------|--------------------------------------------------
list    | -l     | List Arweave- or ArDrive-content.
get     | -g     | Get (more or less) raw data (TX-data, files etc.)
info    | -i     | Obtain detailed information about a target.
status  | -s     | Obtain the current status of a target.
verify  |        | Verify that ArFS-files are uploaded correctly.
console |        | Enter the console. This is the default command.
pending |        | Display network pending TX amount.
version | -v     | Display version info.
help    | --help | Display generic help or command usage info.

## Console
Command | Description
--------|------------------------------------
connect | Connect to Arweave-host or Gateway.
set     | Set a config variable.
exit    | Exit the console.


## Options
Option           | Alt | Description
-----------------|-----|--------------------------------------------------
--quiet          |     | Output only data, no messages or errors. 
--no-msg         |     | Output only data/results and errors. Default for piped.
--msg            |     | Display info on what's done. Default for non-piped.
--msg-stderr     |     | Display info on what's done in STDERR. Use to monitor while piping.
--verbose        | -V  | Display extended runtime info.
--verbose-stderr |     | Display extended runtime info in STDERR. Use to monitor while piping.
--debug          |     | Display extensive debugging info.
--debug-stderr   |     | Display extensive debugging info in STDERR. Use to monitor while piping.
--stderr         |     | Display info and warning messages in STDERR. Same as --msg-out stderr, but sets the LogLevel to >= MSG.                     
--msg-out        |     | Set destinations for info-messages.  FLAGS: stdout, stderr, none
--err-out        |     | Set destinations for error-messages. FLAGS: stdout, stderr, none
--no-ansi        |     | Don't use ANSI codes in output.
--all            | -a  | Display all entries (moved, orphaned etc.). For now, for LIST command only.
--recursive      | -r  | Do a recursive listing (drive listings are by default).
--force          |     | Override abort on some fatal errors.
--less-filters   |     | Try to retrieve omitted entries by lowering the search criteria.
--host           | -h  | Arweave gateway to use. Can include port and proto.
--port           |     | Arweave gateway port.
--proto          |     | Arweave gateway protocol, ie. 'https'.
--timeout-ms     |     | HTTP request timeout. Default is 100000.
--concurrent-ms  |     | Interval between concurrent requests. Default is 200. Increase if issues.
--retry-ms       |     | Delay between retries upon errors. Default is 5000.
--retries        |     | Amount of retries for failed data fetch per entry. Default is 3.
--format         | -f  | Output data format. Valid formats: txt, json, csv



## VERIFY

Verify success of file uploads:
- `verify files <Drive-ID> [OUTPUT] (NUMERIC) [PARAMS]`

Private drives are not yet supported!

**CAUTION: This version doesn't yet track number of confirmation, so it is possible that
  files that are shown as VERIFIED may drop from the chain if it works. Before this tracking
  is implemented, it is advised to run the verify process multiple times to be certain.**

### OUTPUT
Determines what is being listed. If omitted, the default values are used - 
"SUMMARY,NOT-VERIFIED" for regular mode and "SUMMARY,ALL" for **NUMERIC** mode.
These defaults can be changed in the config.

OUTPUT          | Description
----------------|------------------------------------------------------------------------
VERIFIED        | Files that are confirmed to be good.
FAILED          | Failed files, usually Data TX is missing.
PENDING         | Files still waiting to be mined.
MISSING         | Missing files when using NUMERIC mode. **Reliable only if there are no fetch-errors**
ERROR           | Files that could not be fetched, often due to connection errors.
***             | ***
ALL             | All entries in one listing (FILTERED + ERROR)
ALL-SEPARATE    | All entries in separate listings.
NOT-VERIFIED    | FAILED, MISSING, PENDING and ERROR
UPLOAD-NEEDED   | FAILED and MISSING files.
UNKNOWN         | PENDING and ERROR, +MISSING if ERRORs are present.
FILTERED        | All encountered files matching the filter (EXTENSION etc.)
PROCESSED       | All encountered files. May contain duplicate filenames.

### PARAM: 'EXTENSION ext'
Filter processed files by extension. The extension-filter is case-sensitive.
Optional.

### PARAM: 'NUMERIC'
The **NUMERIC** mode is designed to be used with numbered filenames 
(1.png, 2.png etc.), listing missing files along with the regular output. 
Do note that this mode lists a filename as good if ANY healthy entry is found
using that name, as opposed to listing the state of the newest entry.
This mode is meant for files that will not be updated, such as NFTs. 

### PARAM: 'RANGE first-last'
An optional parameter for the NUMERIC mode. If omitted, the range is autodetected.

### PARAM: 'NO-PRUNE'
Disable the default behaviour of only displaying the newest file entity for
each filename. Disabling this will cause a failed file to
to show as failed/upload-needed etc. even if it has been successfully
reuploaded with a different File-ID. The option to disable this exists
only for the possibility that something goes wrong with the pruning process.
This option is currently NOT applicable for the NUMERIC mode.

### EXAMPLES
- `verify files a44482fd-592e-45fa-a08a-e526c31b87f1 summary,verified`
- `verify files a44482fd-592e-45fa-a08a-e526c31b87f1 not-verified`
- `verify files <NFT-drive-id> numeric`
- `verify files <NFT-drive-id> numeric range 1-1000 extension jpg`
- `verify files <NFT-drive-id> numeric upload-needed`


