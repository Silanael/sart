//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Concurrent.js - 2021-11-25_01
// 
// Manages concurrent fetches (downloads).
//

const Sys      = require ("./System");
const Settings = require ("./Settings");
const State    = require ("./ProgramState");

var NextID = 1;

class Fetch
{       
    ID       = null;
    Name     = null;
    Running  = false;
    Finished = false;
    Prom     = null;
    Instance = null;
    Value    = null;    
    

    constructor (promise, name = null)
    {
        if (promise == null)
            return Sys.ERR_PROGRAM ("'func' null.", "Concurrent.Fetch");

        this.Prom = promise;
        this.Name = name;
        this.ID   = NextID++;
    }

    IsRunning      () { return this.Running;  }
    IsFinished     () { return this.Finished; }
    toString       () { return "Fetch #" + this.ID + (this.Name != null ? "[" + this.Name + "]" : ""); }
    GetReturnValue () { if (this.IsFinished () ) return this.Value; else Sys.ERR_PROGRAM ("GetReturnValue: Fetch " + this + " not yet finished!"); return null; }


    /** Batch can either consist of Fetch-objects or Promises. */
    async Execute ()
    {
        await State.Concurrent.Fetch (this);
    }


    async __DoExecute (manager, slot)
    {   
        Sys.DEBUG (this + " exec start at slot " + slot + ".");

        this.Value    = null;
        this.Finished = false;
        this.Running  = false;
        
        this.Value = await this.Prom; 
        
        this.Running  = false;
        this.Finished = true;

        manager.FetchesRunning[slot] = null;

        Sys.DEBUG (this + " done, slot " + slot + " free.");
    }
}



class Manager
{    
    FetchesRunning    = [];    
    
    GetActiveFetchesAmount () { return this.FetchesRunning.length; }


    /** Batch can either consist of Fetch-objects or Promises. */
    async Fetch (...batch)
    {
        const all     = [];
        const active  = [];        
        const queue   = [];
        let pending;
        

        if (batch == null || batch.length <= 0)
        {
            Sys.ERR_PROGRAM ("'promise_batch' null!", "Concurrent.Manager.RunFetches");
            return null;
        }

        Sys.DEBUG ("Concurrent exec start.");

        
        for (const p of batch)
        {                        
            all.push (this.__StartFetch (p instanceof Fetch ? p : new Fetch (p), active, queue) );
        }

        pending = Manager.__GetPendingList (all);        
        State.ActiveTask?.IncrementFetchesBy (pending.length);
                

        while (pending.length > 0)
        {            
            await Promise.race (this.__GetAwaitList () );

            if (queue.length > 0)
            {
                if (! this.__StartFetch (queue.shift (), active, queue) )
                    Sys.ERR_ONCE ("Failed to start a fetch even if there should be room in the queue!", "Concurrent.Manager.RunFetches");
            }
            pending = Manager.__GetPendingList (all);
        }
        
        Sys.DEBUG ("Concurrent fetch ended.");

    }


    __StartFetch (fetch, active, queue)
    {

        if (fetch.IsRunning () )
        {
            Sys.ERR_PROGRAM ("Fetch " + fetch + " already running!");
            return fetch;
        }
        
        else
        {
            Sys.DEBUG ("__StartFetch called for " + fetch + " - active: " + active.length + " queue:" + queue.length + " running:" + this.FetchesRunning.length);

            const max_slots = Settings.GetMaxConcurrentFetches ();

            for (let i = 0; i < max_slots; ++i)
            {
                if (this.FetchesRunning[i] == null)
                {                                                                    
                    fetch.Instance = fetch.__DoExecute (this, i);
                    this.FetchesRunning[i] = fetch;                
                    active.push (fetch);                                                        
                    return fetch;
                }
            }
        }

        // Free slot wasn't found, queue instead.
        Sys.DEBUG ("Queued " + fetch);
        queue.push (fetch);

        return fetch;             
    }

    static __GetPendingList (all)
    {        
        const pending   = [];
            
        for (const a of all)        
        {            
            if (!a.IsFinished () )
            {
                pending.push (a.Instance);
            }
        }
                
        return pending;              
    }

    __GetAwaitList ()
    {        
        const awaitlist = [];
        
        for (const a of this.FetchesRunning)        
        {            
            if (a != null)
                awaitlist.push (a.Instance);
        }
                
        return awaitlist;      
    }
    

}


State.Concurrent = new Manager ();


module.exports = { Fetch, FetchMultiple: State.Concurrent.Fetch }