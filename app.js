var dockerode = require('dockerode'),
    q = require('q'),
    url = require('url');

var docker = dockerode({socketPath: '/var/run/docker.sock'});
var containerList = {};

function listContainers() {
    var deferred = q.defer();

    docker.listContainers(function(err, containers) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(containers);
    });

    return deferred.promise;
}

function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

function memCalc(usage, limit) {
    return round(usage / limit * 100, 2);
}

function cpuCalc(cpu_usage, prev_cpu_usage, system_usage, prev_system_usage, cores) {
    var cpu_delta = cpu_usage - prev_cpu_usage;
    var system_delta = system_usage - prev_system_usage;

    return round(cpu_delta / system_delta * 100 * cores, 2);
}

function iterateContainers(containers) {
    containers.forEach(function(containerInfo) {
        setupStatStream(containerInfo).then(
            function(stream) {
                var prev_cpu_usage = 0,
                    prev_system_usage = 0;
                
                stream.on('readable', function(stream) {
                    var data = JSON.parse(stream.read().toString());
                    var mem = data.memory_stats;
                    var cpu = data.cpu_stats;
                    var cpu_usage = cpu.cpu_usage.total_usage;
                    var system_usage = cpu.system_cpu_usage;
                    var cores = cpu.cpu_usage.percpu_usage.length;
                    console.log(
                        containerInfo.Id,
                        memCalc(mem.usage, mem.limit),
                        cpuCalc(cpu_usage,
                                prev_cpu_usage,
                                system_usage,
                                prev_system_usage,
                                cores) + '\n'
                    );
                    
                    prev_cpu_usage = cpu_usage;
                    prev_system_usage = system_usage;
                });
                
                containerList[containerInfo.Id] = {
                    info: containerInfo,
                    stream: stream
                };
            }
        );
    });
};
    
function setupStatStream(containerInfo) {
    var deferred = q.defer(),
        container = docker.getContainer(containerInfo.Id);
    
    container.stats(function(err, stream) {
        if (err)
            deferred.reject(err);
        else
            deferred.resolve(stream);
    });

    return deferred.promise;
};

listContainers().then(iterateContainers);
