class Listing
{   
    BlockTimestamp = 0;

    Transactions  = [];
   
    ArFSEntries   = [];
    ArFSEntities  = [];
    ArFSDrives    = [];
    ArFSFolders   = [];
    ArFSFiles     = [];
    
    ArFSEntriesAmount  = 0;
    ArFSEntitiesAmount = 0;
    ArFSFilesAmount    = 0;
    ArFSFoldersAmount  = 0;

    StartTime_ms  = null;
    EndTime_ms    = null;
    TimeTaken_ms  = -1;

    Bytes_Reported = 0;

    Running       = true;


    constructor ()
    {
        this.StartTime_ms = new Date ()?.getTime ();
    }

    Done ()
    {
        this.EndTime_ms = new Date ()?.getTime ();
        this.TimeTaken_ms = this.EndTime_ms - this.StartTime_ms;        
        this.Running = false;
    }

    Output (fields = null, format = null, sort = null)
    {
       
    }

};


module.exports = { Listing };



