/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('utils');
 * mod.thing == 'a thing'; // true
 */

var vars = require('vars');

var utils = {
    /** 
     * @param {string} msg
     * @param {Object} obj
     **/
    display: function(msg,obj=Game.spawns['spn1'],posit=0,colr='white') {
        msg = msg.split('\n');
        var linum = 0;
        for (var item in msg){
            // obj.room.visual.text(msg[item], obj.pos.x + 4, obj.pos.y - 2 + linum * 0.75 + posit, {size: '0.75', align: 'left', opacity: 1, color: colr});           
	    obj.room.visual.text(msg[item], 2, obj.pos.y - 2 + linum * 0.75 + posit, {size: '0.75', align: 'left', opacity: 1, color: colr});           
	    linum += 1;
        }
    },

    /** @param {Pop} pop **/
    sustain: function (pop){
	for (var typ in pop) {
	    if (typ == 'total') {break;}
	    if (pop[typ].count < pop[typ].min) {utils.spawn_new(pop[typ].role,pop[typ].parts); break;}
	    if (pop[typ].count < pop[typ].trg) {utils.spawn_new(pop[typ].role,pop[typ].parts); break;}
	}
    },
    
    /** @param {} **/
    upgrade_colony: function() {
	if (vars.room_energy_cap() <= 300 && vars.stage!=0) {utils.stage_0();}
	else if (300 < vars.room_energy_cap() <= 600 && vars.stage!=1) {utils.stage_1();}
    },

    /** @param {} **/
    stage_0: function(){
	vars.population = vars.default_population;
	vars.stage = 0;
    },
    
    /** @param {} **/
    stage_1: function(){
	vars.population.miners.trg=1;
	vars.population.miners.min=1;
	vars.population.carriers.trg=1;	
	vars.population.carriers.min=1;
	vars.population.harvesters.trg=2;
	// vars.population.harvesters.min=0;
	vars.stage=1;
    },
    
    /** @param {} **/
    census: function () {
	var msg = "T." + Game.time + " | E." + vars.room_energy_ava() + ' (' + (100*vars.room_energy_ava()/vars.room_energy_cap()).toFixed(1) + '\%) | S.' + vars.stage + ' |';
	switch (utils.spawnable(vars.best_parts)){
	case 0: msg += ' OK'; break;
	case 1: msg += ' SPAWNING'; break;
	case 2: msg += ' NOT OK'; break;
	case 3: msg += ' VERY NOT OK'; break;
	case 4: msg += ' SO BAD'; break;
	}
	// utils.upgrade_colony();
	utils.stage_0();
        var popul = vars.population;
	popul.total.count = 0;
	vars.target_popul();
        for (var typ in popul){
	    if (typ != 'total'){
		popul[typ].count = _.filter(Game.creeps, (creep) => creep.memory.role == popul[typ].role).length;
		popul.total.count += popul[typ].count;
	    }
	    msg += '\n' + typ + ': ' + popul[typ].count + '/' + popul[typ].trg;
        }
        utils.display(msg,Game.spawns['spn1']);
        return popul;
    },

    /** 
     * @param {string} typ 
     * @param {Array} parts
     **/
    spawn_new: function(typ, parts=vars.best_parts) {
        var newName = typ + Game.time % 10000;
        var spawn = Game.spawns['spn1'];
        if (spawn.spawnCreep(parts,newName,{dryRun: true})==0){
            spawn.spawnCreep(parts, newName,{memory: {role: typ, empty: true, resps: vars.resps[typ]}});
        }
    },
    
    /** @param {} **/
    routines: function() {
    	vars.vis.text("Dan's room",3,1);		
        for(var name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
                console.log('forgetting the dead: ', name);
            }
        }
    },

    /** @param {Creep} creep **/
    pickup_dead: function(creep) {
        var sources = creep.room.find(FIND_TOMBSTONES
        // ,{
            // filter: (tomb) => {return (tomb.store["RESOURCE_ENERGY"] > 0)}
        // }
        );
        if(creep.withdraw(sources[0],RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[0], {visualizePathStyle: {stroke: 'black'}});
        }
	const target = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES);
	if(target) {
	    if(creep.pickup(target) == ERR_NOT_IN_RANGE) {
		creep.moveTo(target);	
	    }
	}
        return sources.length > 0;
    },
    
    /** 
     * @param {Creep} creep 
     * @param {int} choice
     **/
    take: function(creep,choice=0) {
        var sources = vars.home.find(FIND_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_CONTAINER && structure.store > creep.carryCapacity;}});
        if(creep.withdraw(sources[choice]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[choice], {visualizePathStyle: {stroke: '#ffaa00'}});
        }
	
        return sources.length > 0;
    },
    
    /** 
     * @param {Creep} creep 
     * @param {int} choice
     **/
    collect: function(creep,choice=1) {
        var sources = vars.home.find(FIND_SOURCES);
        if(creep.harvest(sources[choice]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[choice], {visualizePathStyle: {stroke: '#ffaa00'}});
        }
        return sources.length > 0;
    },
    
    /** 
     * @param {Creep} creep 
     * @param {int} choice
     **/
    mine: function(creep,choice=1) {
        var sources = vars.home.find(FIND_SOURCES);
	var containers = vars.home.find(FIND_STRUCTURES, {filter: (struct) => struct.structureType == STRUCTURE_CONTAINER});
        if(creep.harvest(sources[choice]) == ERR_NOT_IN_RANGE) {
	    creep.moveTo(containers[0], {visualizePathStyle: {stroke: '#ffaa00'}});
	    // creep.moveTo(sources[choice], {visualizePathStyle: {stroke: '#ffaa00'}});
        }
        return sources.length > 0;
    },
    
    /** @param {Creep} creep **/
    maintain: function(creep) { // top up energy storage structures
        var targets = vars.home.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (creep.memory.resps.includes(structure.structureType)) && structure.energy < structure.energyCapacity;
            }
        });
        if(targets.length > 0) {
            if(creep.transfer(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: 'white'}});
            }
        }
        return targets.length > 0;
    },

    /** @param {Creep} creep **/
    upg_home_controller: function(creep) {
	var status = creep.upgradeController(vars.home.controller);
        if(status == ERR_NOT_IN_RANGE) {
            creep.moveTo(vars.home.controller, {visualizePathStyle: {stroke: 'white'}});
	    return true;
        }
	return status == 0;
    },

    /** @param {Array} parts **/
    spawnable: function(parts) {
	if (Game.spawns['spn1'].spawnCreep(parts, 'test',{dryRun: true})==0){return 0;}
	else if (utils.spawn_cost(parts)<=vars.room_energy_ava()){return 1;}
	else if (utils.spawn_cost(parts)>vars.room_energy_ava() && utils.spawn_cost(parts)<vars.room_energy_cap()){return 2;}
	else if (utils.spawn_cost(parts)>vars.room_energy_cap()){return 3;}
	return 4;
    },

    /** @param {Array} parts **/
    spawn_cost: function(parts) {
        var spawn_cost = 0;
        for (var part in parts){
            if (parts[part] == WORK){spawn_cost+=100;}
            else if (parts[part] == CARRY){spawn_cost+=50;}
            else if (parts[part] == MOVE){spawn_cost+=50;}
        }
        return spawn_cost;
    },

    /** 
     * @param {Creep} creep
     * @param {Object} location 
     **/
    l2dist: function(creep, location) {
        var targetx = location.pos.x;
        var targety = location.pos.y;
        dist = ((creep.x-targetx)**2 + (creep.y-targety)**2)**0.5;
	return dist;
    },
    
    /** 
     * @param {Creep} creep
     * @param {Object} location 
     **/
    l1dist: function(creep, location) {
        var targetx = location.pos.x;
        var targety = location.pos.y;
        dist = (creep.x-targetx) + (creep.y-targety);
	return dist;
    },
    
    /** 
     * @param {Creep} creep
     * @param {Object} location 
     **/
    l8dist: function(creep, location) {
        var targetx = location.pos.x;
        var targety = location.pos.y;
        dist = Math.max(creep.x-targetx, creep.y-targety);
	return dist;
    },
    
    /** @param {Object} target **/
    choose_source: function(target) {
	sources = vars.home.find(FIND_SOURCES);
	var closest_source = sources[0];
	var min_dist = 200;
	for (var source in sources){
	    dist = utils.l8dist(source, target);
	    if (dist < min_dist){
		min_dist = dist;
		closest_source = source;
	    };
	};
	return source;
    },
    
    /** @param {Creep} creep **/
    gobuild: function (creep) {
        var targets = vars.home.find(FIND_CONSTRUCTION_SITES);
        if(targets.length>0) {
            if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: 'white'}});
            }    
        }
        return targets.length > 0;
    },

    /** @param {Creep} creep **/
    gorepair: function (creep) {
        console.log("repairing");
        var targets = vars.home.find(FIND_STRUCTURES, {filter: (structure) => {
	    return creep.memory.resps.includes(structure.structureType) && structure.hits < structure.hitsMax;}
	});
        if(targets.length > 0) {
            if(creep.repair(targets[0], RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(targets[0], {visualizePathStyle: {stroke: 'white'}});
            }
        }
        return targets.length > 0;
    },
    
    tower: {
	/** @param {StructureTower} tower **/
	run: function(tower) {
	    // console.log(tower);
            var interlopers = tower.pos.findClosestByRange(FIND_CREEPS, {filter: (creep) => {return !creep.my;}});
            if(interlopers) {tower.attack(interlopers);}
            else{
		var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
		    filter: (structure) => structure.hits < structure.hitsMax && structure.structureType != STRUCTURE_WALL
		});
		if(closestDamagedStructure) {
		    tower.repair(closestDamagedStructure);
		}
            }   	   
	}
    }
    
};

module.exports = utils;


