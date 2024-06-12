import * as math from "mathjs";
import { Navigation } from "./PedestrianDeadReckoning";

const MAX_WALL_DISTANCE = 0.4;
const USER_DIRECTIONS = 8;

class Particle {
    constructor() {
        this.prevPoint = {
            x: null,
            y: null,
        }
        this.currPoint = {
            x: null, 
            y: null,
        }
        this.heading = 0;
        this.weight = 0;
    }

    getPrevPoint = () =>  {
        return this.prevPoint;
    }

    getCurrPoint = () =>{
        return this.currPoint;
    }

    getHeading = () =>  {
        return this.heading;
    }

    getWeight = () => {
        return  this.weight
    }

    setPrevPoint = (x, y)  => {
        this.prevPoint.x = x;
        this.prevPoint.y = y;
    } 

    setCurrPoint = (x, y) => {
        this.currPoint.x = x;
        this.currPoint.y = y;
    }

    setHeading = (theta) => {
        this.heading = theta;
    }

    setWeight = (w) => {
        this.weight = w;
    }
 }
 
class OccupancyMap {
    constructor(binaryMap = math.matrix([[0]]), resolution=1){
        this.mapData = math.matrix(binaryMap);
        this.resolution = resolution;
        this.nrOfParticles = 100;
        this.yWorldLimits = binaryMap.size()[0] / resolution;
        this.xWorldLimits = binaryMap.size()[1] / resolution

        this.initializedPF = false;
        this.initializedUserPosition = false;
        this.initializedUserHeading = false;
        this.particles = [];
        this.kBest = 10;

        this.estimatedPos = {
            x: null,
            y: null,
            heading: 0
        };
    }

    // GETTERS - SETTERS
    getNrOfParticles = () => {return this.nrOfParticles;}
    setNrOfParticles = (nrOfParticles) => {this.nrOfParticles = nrOfParticles;}

    getK = () => {return this.kBest}
    setK = (k) => {this.kBest = k}

    setEstimatedPos = (x, y) => {
        this.estimatedPos.x = x;
        this.estimatedPos.y = y;

        this.initializedPF = false;
        this.initializedUserPosition = true;
        console.log(`INIT POS ${x}, ${y}`);
    }
    setEstimatedHeading = (theta) => {
        this.estimatedPos.heading = theta;
        this.initializedUserHeading = true;
        console.log(`INIT HEADING`)
    }

    isPFInitialized = () => {return this.initializedPF;}

    clear = () => {

        this.initializedUserPosition = false;
        this.initializedUserHeading = false;
        this.initializedPF = false;
        this.particles = [];

        this.estimatedPos = {
            x: null,
            y: null,
            heading: 0
        }

    }

    // PARTICLE FILTER INITIALIZATION
    initParticles = () => {
        console.log(`INIT ${this.nrOfParticles} PARTICLES`)
        if(!this.initializedUserPosition && !this.initializedUserHeading) {
            for( let i = 0 ; i<this.nrOfParticles; i++) {
                let p = new Particle();
                do {
                    p.currPoint.x = p.prevPoint.x = math.random(0, this.xWorldLimits);
                    p.currPoint.y = p.prevPoint.y = math.random(0, this.yWorldLimits);
                    p.heading = math.random(-180, 180);
                } while (this.isInsideWall(p));
    
                p.weight = 1/this.nrOfParticles;
                this.particles[i] = JSON.parse(JSON.stringify(p));
            }
        } else {
            for(let i=0; i<this.nrOfParticles; i++) {
                let p = new Particle();
                do {
                    p.currPoint.x = this.estimatedPos.x;
                    p.currPoint.y = this.estimatedPos.y;
                    p.heading = math.random(this.estimatedPos.heading - 5, this.estimatedPos.heading + 5);
                } while (this.isInsideWall(p))
                p.weight = 1/this.nrOfParticles;
                this.particles[i] = JSON.parse(JSON.stringify(p));
            }
        }

        // console.log(`=========================================================== INIT PARTICLES ===========================================================`)
        // this.particles.forEach((v, i) =>{
        //     console.log(`${i} PARTICLE ->   \t ${JSON.stringify(v)}`)
        // })
        // console.log(`=========================================================== INIT PARTICLES ===========================================================`)
        // this.estimatedPos.x = math.random(0, this.xWorldLimits-1);
        // this.estimatedPos.y = math.random(0, this.yWorldLimits-1);
        // this.estimatedPos.heading = math.pickRandom([-90, 0, 90]);
        
        this.initializedPF = true;
    }    

    isOutOfBounds = (i, j) => {
        let outOfBoundsX = i < 0 || i > this.mapData.size()[0] - 1;
        let outOfBoundsY = j < 0 || j > this.mapData.size()[1] - 1;

        return (outOfBoundsX || outOfBoundsY);
    }

    isInsideWall = (particle) => {
        // Given that resolution = cells/meter
        let iCell = math.floor(particle.currPoint.y * this.resolution);
        let jCell = math.floor(particle.currPoint.x * this.resolution);
        let OOB = this.isOutOfBounds(iCell, jCell);
        let res = OOB ? true : this.mapData.get([iCell, jCell]);
        return res;
    }

    wallPassCheck = (particle) => {
        
        let prevCell = {
            i: math.floor(particle.prevPoint.y * this.resolution), 
            j: math.floor(particle.prevPoint.x * this.resolution)
        };

        let currCell = {
            i: math.floor(particle.currPoint.y * this.resolution),
            j: math.floor(particle.currPoint.x * this.resolution)
        };

        let distance = {
            i: currCell.i - prevCell.j,
            j: currCell.i - prevCell.j
        };
        
        if(this.isOutOfBounds(currCell.i, currCell.j) || this.isInsideWall(particle)) {
            return 0;
        }
        if(math.norm([distance.i, distance.j])  <= 1) {
            return 1;
        }

        let iMin = prevCell.i === null ? currCell.i : math.min(currCell.i, prevCell.i);
        let iMax = prevCell.i === null ? currCell.i : math.max(currCell.i, prevCell.i);
        
        let jMin = prevCell.j === null ? currCell.j : math.min(currCell.j, prevCell.j);
        let jMax = prevCell.j === null ? currCell.j : math.max(currCell.j, prevCell.j);

        let A = this.mapData.subset(math.index(
            math.range(iMin,  iMax, true), 
            math.range(jMin,  jMax, true)
        ));

        let [r, c] = A.size();

        let iStart = distance.i > 0 ? 0 : r-1;
        let jStart = distance.j > 0 ? 0 : c-1;

        let iEnd = distance.i > 0 ? r-1 : 0;
        let jEnd = distance.j > 0 ? c-1 : 0;

        // let dirX = math.sign(distance.x);
        // let dirY = math.sign(distance.y);


        let potential = findPaths(A, [iStart, jStart], [iEnd, jEnd]);
        return potential;

        // A.set([iStart, jStart], 1);
        // for(let j = jStart + dirX; j !== jEnd + dirX; j+=dirX)  {
        //     if(A.get([iStart,j]) === 0 ) {
        //         A.set([iStart,j], A.get([iStart, j-dirX]))
        //     } else {
        //         A.set([iStart,j], 0);
        //     }
        // } 
        // for(let i=iStart+dirY; i!== iEnd + dirY; i+=dirY) {
        //     if(A.get([i, jStart]) === 0) {
        //       A.set([i, jStart], A.get([i-dirY, jStart]))
        //     } else {
        //       A.set([i,jStart], 0);
        //     }
        // }
        // for(let i=iStart+dirY; i!== iEnd+dirY; i+=dirY) {
        //     for(let j=jStart+dirX; j!=jEnd+dirX; j+=dirX) {
        //         if(A.get([i,j]) === 0) {
        //             A.set([i,j], A.get([i-dirY,j]) + A.get([i,j-dirX]));
        //         } else {
        //             A.set([i,j], 0);
        //         }
        //     }
        // }
        // return {wallHit: A.get([iEnd, jEnd]) === 0, potential: A.get([iEnd, jEnd]) / maxPotentialPaths};
    }

    distanceFromWalls = async (particle) => {
        let iCell = math.floor(particle.currPoint.y * this.resolution);
        let jCell = math.floor(particle.currPoint.x * this.resolution);

        let maxDistance = math.ceil(MAX_WALL_DISTANCE * this.resolution);

        // LOOK UP 
        let pUP = new Promise((resolve, reject)=>{
            for(let i=1; i<=maxDistance; i++){
                if(this.mapData.get([iCell-i, jCell]) === 1){
                    let realDistance = (i-1)/this.resolution + (particle.currPoint.y % (1/this.resolution));
                    resolve(realDistance);
                }
            }
            reject('No close to Wall');
        })

        // LOOK UP-RIGHT
        let pUpRight = new Promise((resolve, reject) => {
            for(let i=1; i<=math.ceil(maxDistance/2); i++){
                if(this.mapData.get([iCell-i, jCell+i]) === 1){
                    let distUp = (i-1)/this.resolution + (particle.currPoint.y % (1/this.resolution));
                    let distRight = (i-1)/this.resolution + (1/this.resolution - (particle.currPoint.x % (1/this.resolution)));
                    let realDistance = math.sqrt(distUp**2 + distRight**2);
                    resolve(realDistance);
                }
            }
            reject('No close to Wall');
        })

        // LOOK RIGHT
        let pRight = new Promise((resolve, reject) =>{
            for(let i=1; i<=maxDistance; i++) {
                if(this.mapData.get([iCell ,jCell+i]) === 1) {
                    let realDistance = (i-1)/this.resolution + (1/this.resolution - (particle.currPoint.x % (1/this.resolution)));
                    resolve(realDistance);
                } 
            }
            reject('No close to Wall');
        })

        //LOOK DOWN-RIGHT
        let pDownRight = new Promise((resolve, reject)=>{
            for(let i=1; i<=math.ceil(maxDistance/2); i++){
                if(this.mapData.get([iCell+i, jCell+i]) === 1) {
                    let distDown = (i-1)/this.resolution + (1/this.resolution - (particle.currPoint.y % (1/this.resolution)));
                    let distRight = (i-1)/this.resolution + (1/this.resolution - (particle.currPoint.x % (1/this.resolution)));
                    let realDistance = math.sqrt(distDown**2 + distRight**2);
                    resolve(realDistance);
                }
            }
            reject('No close to Wall');
        })

        // LOOK DOWN
        let pDown = new Promise((resolve,reject)=>{
            for(let i=1; i<=maxDistance; i++) {
                if(this.mapData.get([iCell+i, jCell]) === 1) {
                    let realDistance = (i-1)/this.resolution + (1/this.resolution - (particle.currPoint.y % (1/this.resolution)));
                    resolve(realDistance);
                }
            }
            reject('No close to Wall');
        })
        
        // LOOK DOWN-LEFT
        let pDownLeft = new Promise((resolve, reject)=>{
            for(let i=1; i<=math.ceil(maxDistance/2); i++){
                if(this.mapData.get([iCell+i, jCell-i]) === 1) {
                    let distDown = (i-1)/this.resolution + (1/this.resolution - (particle.currPoint.y % (1/this.resolution)));
                    let distLeft = (i-1)/this.resolution + (particle.currPoint.x % (1/this.resolution));
                    let realDistance = math.sqrt(distDown**2 + distLeft**2);
                    resolve(realDistance);
                }
            }
            reject('No close to Wall');
        })

        // LOOK LEFT
        let pLeft = new Promise((resolve, reject) => {
            for(let i=1; i<=maxDistance; i++) {
                if(this.mapData.get([iCell ,jCell-i]) === 1) {
                    let realDistance = (i-1)/this.resolution + (particle.currPoint.x % (1/this.resolution));
                    resolve(realDistance);
                }
            }
            reject('No close to Wall');
        })

        //LOOK UP-LEFT
        let pUpLeft = new Promise((resolve, reject)=>{
            for(let i=1; i<=math.ceil(maxDistance/2); i++){
                if(this.mapData.get([iCell-i, jCell-i]) === 1) {
                    let distUp = (i-1)/this.resolution + (particle.currPoint.y % (1/this.resolution));
                    let distLeft = (i-1)/this.resolution + (particle.currPoint.x % (1/this.resolution));
                    let realDistance = math.sqrt(distUp**2 + distLeft**2);
                    resolve(realDistance);
                }
            }
            reject('No close to Wall');
        })
         
        // let resolvedPromises = (await Promise.allSettled([pUP, pUpRight, pRight, pDownRight, pDown, pDownLeft, pLeft, pUpLeft])).filter((v) => v.status==='fulfilled').map((v) => v.value);

        // let res = JSON.parse(JSON.stringify(resolvedPromises));
        // console.log(`RES = ${res}`);
        // return res;

       return await Promise.allSettled([pUP, pUpRight, pRight, pDownRight, pDown, pDownLeft, pLeft, pUpLeft]);
    }

    runParticleFilter = async (stepLength, yawChange) => {
        if(!this.initializedPF) { 
            this.initParticles();
            return; 
        }
        this.moveParticles(stepLength, yawChange);

        await this.updateWeights();

        // Compute the Neff
        let N = this.nrOfParticles;
        let sumSq = this.particles.map(v => v.weight).reduce((p,c) => p + c*c, 0);

        let Neff = 1/sumSq;

        console.log(`Neff = ${Neff}`);
        if(Neff < N/3) {
            let particleIndexes = this.systematicResample(this.particles);
            // Create Deep Copies of each Resampled Particle
            let newParticles = [];
            particleIndexes.forEach((v) => {
                let newP = JSON.parse(JSON.stringify(this.particles[v]));
                newParticles.push(newP);
            })
            // Create a Deep Copy of the particle array
            this.particles = JSON.parse(JSON.stringify(newParticles));

            // Normalize  Weights
            let wSum = this.particles.map(v => v.weight).reduce((p,c) => p + c,0);
            this.particles.map(v => v.weight/wSum).forEach((v, i) => this.particles[i].weight = v);

            console.log(`=========================================================== RESAMPLED PARTICLES ===========================================================`)
            this.particles.forEach((v,i) => {
                console.log(`PARTICLE ${i} ->  \t ${JSON.stringify(v)} `);
            })
            console.log(`=========================================================== RESAMPLED PARTICLES ===========================================================`)

        }
    }

    // PROPAGATE 
    moveParticles = (l, deltaTheta) => {
        // console.log(`=========================================================== MOVE PARTICLES ===========================================================`)
        for(let i=0; i< this.nrOfParticles; i++) {
            // Create a Reference Copy of each Particle
            let p = this.particles[i];
            if (p.weight != 0)  {
                let dl = gaussianRandom(0, 0.2);
                let dth = gaussianRandom(0, 2);

                p.heading = p.heading + deltaTheta + dth;
                p.prevPoint.x = p.currPoint.x;
                p.prevPoint.y = p.currPoint.y;

                // WORLD COORDINATES (X LEFT, Y UP) -> MAP COORDINATES (X RIGHT, Y DOWN) 
                p.currPoint.x = p.currPoint.x + (l + dl) * (-math.sin(p.heading * math.pi/180));
                p.currPoint.y = p.currPoint.y + (l + dl) * (-math.cos(p.heading * math.pi/180))
            }           
        }
        
        // this.estimatedPos.heading = this.estimatedPos.heading + deltaTheta;
        // this.estimatedPos.x = this.estimatedPos.x + l*(-math.sin(this.estimatedPos.heading * math.pi/180));
        // this.estimatedPos.y = this.estimatedPos.y + l*(-math.cos(this.estimatedPos.heading * math.pi/180));
            // this.particles.forEach((v, i) =>{
            //     console.log(`${i} PARTICLE ->   \t ${JSON.stringify(v)}`)
            // })
        // console.log(`=========================================================== MOVE PARTICLES ===========================================================`)
    }

    // UPDATE
    updateWeights = async () => {
        for (let p of this.particles) {
        //     if(p.weight !== 0){
        //         let potential = this.wallPassCheck(p);
        //         if(potential === 0 ) {
        //             p.weight = 0;
        //             p.currPoint.x = p.currPoint.y = 0;
        //             p.prevPoint.x = p.prevPoint.y = 0;
        //         } else {

        //         p.weight = p.weight * potential;
        //         let isCloseToWall = this.distanceFromWalls(p).then((res)=> true, (rej)=>false);
        //         if(isCloseToWall) {p.weight = p.weight * 0.8}
                
        //     }
        // }

            if(p.weight === 0) {
                continue;
            } else {
                if(this.isInsideWall(p)) {
                    p.weight = 0;
                    p.currPoint.x = p.currPoint.y = 0;
                    p.prevPoint.x = p.prevPoint.y = 0;
                } else {

                    let wallDistances = await this.distanceFromWalls(p).then((res) => {
                        return res.filter((v)=>v.status==='fulfilled').map((v) => v.value);
                    })
                    if(wallDistances.length > 0){
                        let freeDirections = USER_DIRECTIONS - wallDistances.length; //all directions are 8;
                        let maxDistanceSum = (USER_DIRECTIONS - freeDirections) * MAX_WALL_DISTANCE //maxWallDistance = 0.4
                        let distanceSum = math.sum(wallDistances);

                        p.weight = p.weight * (freeDirections/USER_DIRECTIONS) * (distanceSum/maxDistanceSum);
                    }
                }
            }
        }

        let wSum = this.particles.map(v => v.weight).reduce((p,c) => p + c,0);
        // Normalize  Weights
        this.particles.map(v => v.weight/wSum).forEach((v, i) => this.particles[i].weight = v);

        this.particles.sort((a, b) => b.weight - a.weight);

        if(this.kBest === 1) {
            this.estimatedPos.x = this.particles[0].currPoint.x;
            this.estimatedPos.y = this.particles[0].currPoint.y;
            this.estimatedPos.heading = this.particles[0].heading;
            return;
        }
        let kBestParticles = math.subset(this.particles, math.index(math.range(0,this.kBest)));
        let weightedSum = kBestParticles.reduce((sum, value) => sum + value.weight, 0);
        this.estimatedPos.x = kBestParticles.reduce((sum, v) => sum + v.currPoint.x * v.weight, 0) / weightedSum;
        this.estimatedPos.y = kBestParticles.reduce((sum, v) => sum + v.currPoint.y * v.weight, 0) / weightedSum;
        this.estimatedPos.heading = kBestParticles.reduce((sum, v) => sum + v.heading * v.weight, 0) / weightedSum;
    }

    // RESAMPLE
    systematicResample = (particleArray) => {
        let N = this.nrOfParticles;
        
        //cummulative sum of weights
        let cWeights = [];
        cWeights.push(particleArray[0].weight);

        for(let i=0; i<N-1; i++) {
            cWeights.push(cWeights[i] + particleArray[i+1].weight);
        }

        // console.log(`CWEIGHTS = ${cWeights}`);

        //Starting Random Point [0, 1/N)
        let startingPoint = math.random(0, 1/N);
        // console.log(`STARTING POINT = ${startingPoint}`)
        let resampledIndex = [];

        for(let i=0; i<N; i++) {
            let currentPoint = startingPoint + (1/N) * i;
            let s = 0;
            while(currentPoint > cWeights[s]) {
                s = s+1;
            }
            resampledIndex.push(s);
        }

        console.log(`INDEXES = ${resampledIndex}`);
        return resampledIndex;
    }

}


// Using Box-Muller transform to generate a random number drawn from a normal ditstribution
const gaussianRandom = (m, std) => {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

    return z * std + m;
}

function findPaths(mat, start, end) {

    let [rows, cols] = mat.size();
    let [startX, startY] = start;
    let [endX, endY] = end;

    if (mat.get([startX, startY]) === 1 || mat.get([endX, endY]) === 1) {
        return 0; // No paths if start or end is blocked
    }

    let directions = [
        [0, 1], // right
        [1, 0], // down
        [0, -1], // left
        [-1, 0] // up
    ];

    let queue = [[[startX, startY], [[startX, startY]]]]; // [[(x, y), path]]
    let paths = [];

    while (queue.length > 0) {
        let [[x, y], path] = queue.shift();

        if (x === endX && y === endY) {
            paths.push(path);
            continue;
        }

        for (let [dx, dy] of directions) {
            let nx = x + dx;
            let ny = y + dy;

            if (nx >= 0 && nx < rows && ny >= 0 && ny < cols && mat.get([nx, ny]) === 0 && !path.some(([px, py]) => px === nx && py === ny)) {
                queue.push([[nx, ny], path.concat([[nx, ny]])]);
            }
        }
    }

    let pathMatrix = math.zeros(rows,cols);

    for(let path of paths) {
        for(let [x, y] of path) {
            pathMatrix.set([x, y], 1);
        }
    }

    return math.sum(pathMatrix) / (rows * cols);
}

export { Particle, OccupancyMap }
