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


class Fetch
{       
    Prom    = null;
    Value   = null;
    
    constructor (promise)
    {
        if (promise == null)
            return Sys.ERR_PROGRAM ("'func' null.", "Concurrent.Fetch");

        this.Prom = promise;
    }

    async Execute (manager, slot)
    {   
        this.Value = null;

        if (manager == null)
            return Sys.ERR_PROGRAM ("'manager' null.", "Concurrent.Fetch");

        if (slot == null)
            return Sys.ERR_PROGRAM ("'slot' null.", "Concurrent.Fetch");


        Sys.DEBUG ("Fetch.Execute start at slot " + slot + ".");  

        this.Value = await this.Prom;
        
        Sys.DEBUG ("Slot " + slot + " done.");

        manager.__OnFetchFinished (slot);
    }
}


class Manager
{    
    FetchesRunning    = [];
    FetchFuncsQueued  = [];
    __Running         = 0;
    MaxSlots          = null;

    GetActiveFetchesAmount () { return this.FetchesRunning.length; }

    AddFetch (promise)
    {
        if (this.MaxSlots == null)
            this.MaxSlots = Settings.GetMaxConcurrentFetches ();

        let slot_found = false;
        for (let i = 0; i < this.MaxSlots; ++i)
        {
            if (this.FetchesRunning[i] == null)
            {
                const t = new Fetch (promise)
                this.FetchesRunning[i] = t;                
                this.FetchesRunning[i].Instance = t.Execute (this, i);
                slot_found = true;        
                break;
            }
        }

        if (!slot_found)
        {
            this.FetchFuncsQueued.push (promise);
            Sys.INFO ("Queued a task.");
        }
             
    }

    __GetAwaitList ()
    {        
        const pending = [];
        for (let i = 0; i < this.MaxSlots; i++)
        {
            if (this.FetchesRunning[i] != null)
                pending.push (this.FetchesRunning[i].Instance);
        }
        return pending;      
    }
    
    __OnFetchFinished (slot)
    {
        this.FetchesRunning[slot] = null;        
        --this.__Running;
    }



    async Execute ()
    {
        if (this.MaxSlots == null)
            this.MaxSlots = Settings.GetMaxConcurrentFetches ();

        Sys.DEBUG ("Concurrent exec start.");
        
        let await_list;

        while ( (await_list = this.__GetAwaitList () )?.length > 0 )
        {
            Sys.INFO ("Awaiting for " + await_list.length + " entries..");        
            await Promise.race (await_list);

            if (this.FetchFuncsQueued.length > 0)
                this.AddFetch (this.FetchFuncsQueued.shift () );            
        }
        
        Sys.INFO ("Concurrent exec ended.");

    }
}


State.Concurrent = new Manager ();


module.exports = Manager;