
class ArFSDriveQuery extends TXQuery
{
   
   /* Override */ async ExecuteReqOwner ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: SORT_DEFAULT} )
   {
       Sys.ERR ("ExecuteReqOwner not applicable to this query type.", this);
       return false;        
   }
   

   async Execute (owner = null, deep = false)
   {       
        this.Sort = SORT_NEWEST_FIRST;

    

        const results = 
        { 
            Info:
            {
                Address:     owner,
                ScanType:    deep ? "Deep" : "Quick",
                DrivesFound: 0,
                Errors:      0, 
                Drives:      {}
            },
            
            DriveEntities:  {},
            ProcessedIDs:   {},
        
            RECURSIVE_FIELDS: ["Drives"],
        };
    

        // Deep scan - look for all files on the address and pick unique Drive-IDs.
        //
        if (deep)
        {            
            if (owner == null)
            {
                Sys.ERR ("Owner needs to be set for deep scan. Was null.", "ArFSDriveQuery");
                return null;
            }

            Sys.INFO ("Performing a deep scan for drives on " + owner + " ...");

            const tags = 
            [ 
                Tag.QUERYTAG (ArFSDefs.TAG_ENTITYTYPE, ArFSDefs.ENTITYTYPES_INFOLDER),
            ];
            TXTag.ADD_NATIVE_TAGS (tags, State.Config.ArFSTXQueryTags);

            await super.Execute
            (            
                {
                    owner: owner,
                    sort:  this.Sort,
                    tags:  tags,                
                }
            );

            // Go through the entries
            if (this.Entries != null)
            {
                // Look for unique Drive-IDs
                for (const e of this.Entries)
                {
                    const drive_id = e?.GetTag (ArFSDefs.TAG_DRIVEID);
                    results.ProcessedIDs[drive_id] = true;
                }

                // Try to get the drive-entities
                let found = 0;            
                for (const d of Object.keys (results.ProcessedIDs) )
                {
                    await this.__ProcessDrive (d, results);
                    ++found;
                }

                results.Info.DrivesFound = found;
            }

        }
        
        // Regular scan, just look for Entity-Type = drive.
        else
        {
            const tags = 
            [ 
                Tag.QUERYTAG (ArFSDefs.TAG_ENTITYTYPE, ArFSDefs.ENTITYTYPE_DRIVE),
            ];
            TXTag.ADD_NATIVE_TAGS (tags, State.Config.ArFSTXQueryTags);

            Sys.INFO ("Performing a surface scan for drives on " + (owner != null ? owner + " ..." : "the entire Arweave. Might take a while...") );
            
            await super.Execute
            (            
                {
                    owner: owner,
                    sort:  this.Sort,
                    tags:  tags,                
                }
            );

            const all_entries = this.Entries;

            if (all_entries != null && all_entries.length > 0)
            {
                for (const e of this.Entries)
                {
                    const drive_id = e?.GetTag (ArFSDefs.TAG_DRIVEID);

                    if (drive_id != null && results.ProcessedIDs[drive_id] == null)
                    {
                        results.ProcessedIDs[drive_id] = true;
                        await this.__ProcessDrive (drive_id, results);                    
                    }
                }
            }

            results.Info.DrivesFound = Object.keys (results.Info.Drives)?.length;
        }

        return results;
   }

   async __ProcessDrive (drive_id, results)
   {
        // I could have parsed the entries I already got, but
        // doing it in multiple different ways is asking for trouble.
        const drive_entity_query = new ArFSEntityQuery (this.Arweave);
        const drive_entity       = await drive_entity_query.Execute (drive_id, ArFSDefs.ENTITYTYPE_DRIVE);

        if (drive_entity != null)
        {
            await drive_entity.UpdateBasic (this.Arweave, true, true, true);
            results.DriveEntities[drive_id] = drive_entity;

            const drive_owner  = drive_entity.GetOwner   ();
            const name         = drive_entity.GetName    ();
            const privacy      = drive_entity.GetPrivacy ();
            const encrypted    = drive_entity.IsEncrypted ();
            let lastmodif      = drive_entity.GetLastModified ();

            if (lastmodif == null)
                lastmodif = Util.GetDummyDate ();

            results.Info.Drives[drive_id] = (drive_owner != null ? drive_owner + "  " : "" )
                                            + lastmodif + "  "
                                            + (privacy != null ? privacy.padEnd (8, " ") : "UNKNOWN") + " "                                                       
                                            + (name != null ? name : "")

        }
        else
        {
            results.Info.Drives[drive_id] = "!!! FAILED TO RETRIEVE DRIVE-ENTITY !!!";
            results.Info.Errors += 1;
        }
   }

}


class ArFSDriveContentQuery extends TXQuery
{       
    async Execute (drive_id, owner)
    {       

        this.Sort = SORT_NEWEST_FIRST;

        if (drive_id == null)
            return Sys.ERR_PROGRAM ("drive_id null", "ArFSDriveContentQuery");

        if (owner == null)
            return Sys.ERR_PROGRAM ("owner null", "ArFSDriveContentQuery");



        const tags = 
        [ 
            Tag.QUERYTAG (ArFSDefs.TAG_ENTITYTYPE,    ArFSDefs.ENTITYTYPES_INFOLDER),
            Tag.QUERYTAG (ArFSDefs.TAG_DRIVEID,       drive_id),
        ];
        TXTag.ADD_NATIVE_TAGS (tags, State.Config.ArFSTXQueryTags);
        

        await super.Execute
        (            
            {
                owner: owner,          
                sort:  this.Sort,
                tags:  tags,                
            }
        );

        const report = 
        {
            Info : 
            {
                Metadata        : 0,    
                UniqueFileIDs   : 0,
                UniqueFolderIDs : 0,
                OrphanedEntities: 0,
                OrphanedFiles   : 0,
                OrphanedFolders : 0,            
                UnknownEntities : 0,
                Errors          : null                
            },
            
            Files:           {},
            Folders:         {},
            All:             {},
            Orphaned:        {},
            OrphanedFiles:   {},
            OrphanedFolders: {},
            MissingFolders:  {},
            Parentless:      {},            
            Unknown:         {},
            EntityTypes:     {},
        }

        if (this.Entries != null)
        {
            report.Info.Metadata = this.Entries.length;

            let newer, error;

            for (const e of this.Entries)
            {
                const entity_type = e.GetTag (ArFSDefs.TAG_ENTITYTYPE);
                const id          = e.GetTag (ArFSDefs.GetTagForEntityType (entity_type) );

                if (entity_type == null)
                {
                    error = "Entity-Type missing for " + e.GetTXID ();                    
                    Sys.ERR (error, drive_id);
                    report.Errors = Util.AppendToArray (report.Errors, error);
                    continue;
                }
                
                if (id == null)
                {
                    error = "ArFS-ID missing for " + e.GetTXID ();                    
                    Sys.ERR (error, drive_id);
                    report.Errors = Util.AppendToArray (report.Errors, error);                    
                    continue;
                }
                

                const obj = entity_type == ArFSDefs.ENTITYTYPE_FILE ? report.Files
                                                                    : entity_type == ArFSDefs.ENTITYTYPE_FOLDER ? report.Folders : report.Unknown;
                                        
                if (obj[id] == null || (newer = e.IsNewerThan (obj[id])) == true)
                {
                    obj                [id] = e;
                    report.All         [id] = e;
                    report.EntityTypes [id] = entity_type;

                    if (newer)
                        Sys.VERBOSE ("Overwrote "+ obj[id]?.GetTXID () + " with " + e.GetTXID () + " as the latter seems to be newer." );
                }

                else
                    Sys.VERBOSE ("Omitted " + e.GetTXID () + " as it was older than " + obj[id]?.GetTXID () );
                
            }

            // Look for orphaned
            for (const f of Object.entries (report.All) )
            {
                const entry            = f[1];
                const arfs_id          = f[0];
                const parent_folder_id = entry?.GetTag (ArFSDefs.TAG_PARENTFOLDERID);
                const txid             = entry?.GetTXID ();
                const entity_type      = report.EntityTypes[arfs_id];

                if (parent_folder_id == null)
                    report.Parentless[arfs_id] = entry;

                else if (report.Folders[parent_folder_id] == null)
                {
                    report.MissingFolders[parent_folder_id] = true;

                    if (report.Orphaned[arfs_id] == null || entry?.IsNewerThan (report.Orphaned[arfs_id]) )
                    {
                        report.Orphaned[arfs_id] = f[1];
                    
                        Sys.VERBOSE ("Orphaned entity found - ArFS-ID:" + arfs_id + " TXID:" + txid
                            + " - should be in folder " + parent_folder_id + " which doesn't exist.");

                        switch (entity_type)
                        {
                            case ArFSDefs.ENTITYTYPE_FILE:
                                report.OrphanedFiles[arfs_id] = entry;
                                error = "Orphaned file: " + arfs_id;
                                report.Errors = Util.AppendToArray (report.Errors, error);
                                break;

                            case ArFSDefs.ENTITYTYPE_FOLDER:
                                report.OrphanedFolders[arfs_id] = entry;
                                error = "Orphaned folder: " + arfs_id;
                                report.Errors = Util.AppendToArray (report.Errors, error);
                                break;

                            case ArFSDefs.ENTITYTYPE_DRIVE:
                                error = "There's a drive inside a drive? What the fuck? " + arfs_id;
                                Sys.ERR (error, drive_id);                                
                                report.Errors = Util.AppendToArray (report.Errors, error);
                                break;

                            default:
                                error = "Orphaned with unknown Entity-Type [" + entity_type + "]: " + arfs_id;
                                Sys.ERR (error, drive_id);                                
                                report.Errors = Util.AppendToArray (report.Errors, error);
                                break;
                        }
                        if (report.Info.Orphans == null)
                            report.Info.Orphans = {};

                        report.Info.Orphans[arfs_id] = "TXID:" + txid + " (" + entity_type + ") - Missing:" + parent_folder_id;
                    }
                }

            }

            report.Info.UniqueFileIDs    = Object.keys (report.Files)           ?.length;
            report.Info.UniqueFolderIDs  = Object.keys (report.Folders)         ?.length;           
            report.Info.UnknownEntities  = Object.keys (report.Unknown)         ?.length;
            report.Info.OrphanedEntities = Object.keys (report.Orphaned)        ?.length;
            report.Info.OrphanedFiles    = Object.keys (report.OrphanedFiles)   ?.length;
            report.Info.OrphanedFolders  = Object.keys (report.OrphanedFolders) ?.length;
            
            let folder_ids = Object.keys (report.MissingFolders);
            if (folder_ids?.length >= 0)
            {
                report.Info.MissingFolders = [];
                for (const k of folder_ids)
                {
                    report.Info.MissingFolders.push (k);
                }
            }



            const parentless = Object.keys (report.Parentless)?.length;
            if (parentless > 1)
            {
                Sys.WARN ("Encountered " + parentless + " entities that lack " + ArFSDefs.TAG_PARENTFOLDERID +
                          + "It's normal to have one folder-entity like this (the root folder) but no more than that.");

                report.Errors = Util.AppendToArray (report.Errors, "Multiple folders with no Parent-Folder-Id -tag.");

                report.Info.Parentless = {};

                for (const e of report.Parentless)
                {
                    report.Info.Parentless[e[0]] = "TXID:" + e[1]?.GetTXID ();
                }
            }
        }

        return report;
    }
}




class LatestQuery extends TXQuery
{
   
   /** Retrieve drive's owner address. */
   async Execute (tags = [], address = null)
   {       
       this.Sort = SORT_NEWEST_FIRST;

        await super.ExecuteOnce
        (
            TXQuery.CreateTxQuery 
            ({                     
                    first:  1,
                    owner:  address,                     
                    sort:   this.Sort,
                    tags:   tags,                                        
            })
        );

        if (this.GetEntriesAmount () == 1)        
            return this.GetEntry (0);

        else
        {
            Sys.VERBOSE ("Could not find a transaction for tags: " + Util.ObjToStr (tags) );
            return null;
        }
   }
}


