/**
 * Created by Timo Kersten on 05.04.14.
 *
 * This artificial intelligence tries to find the option that promises
 * the highest number of merged tiles.
 *
 * A breath-first search is used to evaluate playing options and possible random tile
 * placements.
 *
 * To estimate the number of merging tiles for each option, the outcome of possible random
 * tile placements is averaged. For choices, the best option is assumed. Thus the outcome
 * of a choice is estimated to be the maximum of all possible tile merges.
 */

// search depth
var maxDepth = 4;
// search depth upper bound
var maxDHigh = 5;
// search depth lower bound
var maxDLow = 4;

var toLeft;

var actions = [0, 1, 2, 3]

function AI(gameManager){

    this.gameManager = gameManager;
    this.run = false;

    //connect to UI
    gameManager.inputManager.bindButtonPress(".step-ai", this.step.bind(this));
    gameManager.inputManager.bindButtonPress(".start-ai", this.start.bind(this));
    gameManager.inputManager.bindButtonPress(".stop-ai", this.stop.bind(this));

    var start = window.performance.now();
    this.makeMoveTables();
    console.log(window.performance.now() - start);

}

/**
 * Starts automatic play
 */
AI.prototype.start = function(){
    if (!this.run){
        this.run = true;
        this.move();
    }
}


/**
 * Stops automatic play
 */
AI.prototype.stop = function(){
    this.run = false;
}

/**
 * Plays one move
 */
AI.prototype.step = function(){

    var state = this.encode(this.gameManager.grid);

    //adaptive search depth
    var numFreeCells = this.freeCells(state[0], state[1]);
    if (numFreeCells <= 5){
        maxDepth = 8;
    }else if (numFreeCells <= 6){
        maxDepth = 7;
    }else if (numFreeCells <= 8){
        maxDepth = 6;
    }else{
        maxDepth = 4;
    }

    var decNode = this.getDecisionNode(state[0], state[1], 4);
    var choice = decNode.maxOption;
    //play best option
    this.gameManager.move(choice);
}

/**
 * Do continuous playing
 */
AI.prototype.move = function(){
    this.step();
    if (this.run)
        setTimeout(this.move.bind(this), 10);
}

/**
 * Creates a breath-first search tree, beginning with a decision
 * @param state The state to start in
 * @param remainingDepth The number of recursion steps remaining
 * @returns {DecisionNode}
 */
AI.prototype.getDecisionNode = function(halfGridUpper, halfGridLower, remainingDepth){

    var node = new DecisionNode();

    var that = this;

    actions.forEach(function(option){
        //decode2(halfGridUpper, halfGridLower);
        //console.log(option);
        var result = that.executeMove(option, halfGridUpper, halfGridLower);
        //decode2(result.u, result.l);

        //Add move to possible actions only if
        //option created a move (which advances the game)
        if (result.u != halfGridUpper || result.l != halfGridLower){
            //node.decisions[option] = result;
            // node.merges[option] = result.merges;
            //if (copy.over && !copy.won){
            //TODO
                //if this move results in ending the game, give a penalty!
            //    node.merges[option] = -1000;
            //}else{
                var avgMerges = that.getPossibilitiesNode(result.u, result.l, remainingDepth - 1);
                //node.children[option] = possNode;
                var merges;
                if (avgMerges){
                    merges = avgMerges + result.merges;
                }else{
                    merges = result.merges;
                }
                if (merges >= node.maxMerges){
                    node.maxMerges = merges;
                    node.maxOption = option;
                }
                if (remainingDepth == 3){
                    console.log(option, merges);
                }

            //}
        }
        if (remainingDepth == 3){
            console.log("---");
        }

    });

    return node;
}

/**
 * Creates a breath-first search tree, beginning with enumerating all possible tile placements
 * @param state The state to start in.
 * @param remainingDepth The number of recursion steps remaining
 * @returns {*}
 */
AI.prototype.getPossibilitiesNode = function(halfGridUpper, halfGridLower, remainingDepth){

    if (!remainingDepth){
        return false;
    }

    //var node = new PossibilitiesNode();

    var count = 0;
    var sum = 0;

    for (var i = 0; i < 32; i += 4){

        //if position is unoccupied
        if (((halfGridUpper >>> i) & 0xf) == 0){

            var decNode = this.getDecisionNode(halfGridUpper | (0x1 << i), halfGridLower, remainingDepth);
            count++;
            sum += decNode.maxMerges;

        }

        //if position is unoccupied
        if (((halfGridLower >>> i) & 0xf) == 0){

            decNode = this.getDecisionNode(halfGridUpper, halfGridLower | (0x1 << i), remainingDepth);
            count++;
            sum += decNode.maxMerges;

        }

    }

    return count == 0 ? 0 : sum / count;
}

AI.prototype.makeMoveTables = function(){
    this.toLeft = new Uint32Array(65536);
    this.toRight = new Uint32Array(65536);

    this.toTopUpper = new Uint32Array(65536);
    this.toTopLower = new Uint32Array(65536);

    this.toBottomUpper = new Uint32Array(65536);
    this.toBottomLower = new Uint32Array(65536);

    this.merges = new Uint32Array(65536);

    var cell = new Uint32Array(4);

    //debugger;

    /**
     * row format: 4 bits per cell, leftmost cell at lowest position in integer, 4 cells per int
     */

    for (var row = 0; row < 65536; row++){

        cell[0] = row & 0xf;
        cell[1] = row >>> 4  & 0xf;
        cell[2] = row >>> 8  & 0xf;
        cell[3] = row >>> 12 & 0xf;

        var reverse = cell[0] << 12 | cell[1] << 8 | cell[2] << 4 | cell[3];
        var merges = 0;

        for (var i = 0; i < 3; i++){
            var j;
            //look for next non zero field
            for (j = i + 1; j < 4; j++){
                if (cell[j] != 0){
                    break;
                }
            }
            //nothing else to do if rightmost cell is zero
            if (j == 4){
                break;
            }

            if (cell[i] == 0){
                cell[i] = cell[j];
                cell[j] = 0;
                i--;
            }else if(cell[i] == cell[j]){
                merges++;
                cell[i] += 1;
                cell[j] = 0;
            }
        }

        this.merges[row] = merges;

        this.toLeft[row] = (cell[0] | (cell[1] << 4) | (cell[2] << 8) | (cell[3] << 12));

        //decode2(row, this.toLeft[row]);
        //debugger;

        this.toRight[reverse] = (cell[3] | (cell[2] << 4) | (cell[1] << 8) | (cell[0] << 12));

        this.toTopUpper[row] = (cell[0] | (cell[1] << 16));
        this.toTopLower[row] = (cell[2] | (cell[3] << 16));

        this.toBottomUpper[reverse] = (cell[3] | (cell[2] << 16));
        this.toBottomLower[reverse] = (cell[1] | (cell[0] << 16));
    }
}

AI.prototype.encode = function(grid){
    var halfGridUpper = 0;
    var halfGridLower = 0;
    grid.eachCell(function(x,y, tile){
        if (tile != null){
            if (y < 2){
                halfGridUpper |= (Math.log(tile.value) / Math.log(2)) << (y * 16) + x * 4;
            }else{
                halfGridLower |= (Math.log(tile.value) / Math.log(2)) << ((y - 2) * 16) + x * 4;
            }
        }

    });
    //decode2(halfGridUpper, halfGridLower);
    return [halfGridUpper, halfGridLower];
}

AI.prototype.moveLeft = function(halfGridUpper, halfGridLower){

    var row1 = halfGridUpper & 0xffff;
    var row2 = (halfGridUpper & 0xffff0000) >>> 16;

    var row3 = halfGridLower & 0xffff;
    var row4 = (halfGridLower & 0xffff0000) >>> 16;

    var res = { u: this.toLeft[row1] | (this.toLeft[row2] << 16),
             l: this.toLeft[row3] | (this.toLeft[row4] << 16),
             merges: this.merges[row1] + this.merges[row2] + this.merges[row3] + this.merges[row4]};

    return res;
}

AI.prototype.moveRight = function(halfGridUpper, halfGridLower){

    var row1 = halfGridUpper & 0xffff;
    var row2 = (halfGridUpper & 0xffff0000) >>> 16;
    var row3 = halfGridLower & 0xffff;
    var row4 = (halfGridLower & 0xffff0000) >>> 16;

    var res= {u: this.toRight[row1] | (this.toRight[row2] << 16),
            l: this.toRight[row3] | (this.toRight[row4] << 16),
            merges: this.merges[row1] + this.merges[row2] + this.merges[row3] + this.merges[row4]};



    return res;
}

AI.prototype.moveUp = function(halfGridUpper, halfGridLower){

    var newUpper = 0;
    var newLower = 0;
    var col = 0;
    var merges = 0;

    for (var i = 0; i < 4; i++){
        col = ((halfGridUpper >>> (i * 4)) & 0xf) | ((halfGridUpper >>> (12 + i * 4)) & 0xf0)
                | ((halfGridLower << 8 >>> (4 * i)) & 0xf00) | ((halfGridLower  >>> (4 + i * 4)) & 0xf000);

        newUpper |= this.toTopUpper[col] << (i * 4);
        newLower |= this.toTopLower[col] << (i * 4);
        merges += this.merges[col];
    }

    var res = {u: newUpper,
            l: newLower,
            merges: merges};



    return res;

}

AI.prototype.moveDown = function(halfGridUpper, halfGridLower){
    var newUpper = 0;
    var newLower = 0;
    var col = 0;
    var merges = 0;

    for (var i = 0; i < 4; i++){
        col = ((halfGridUpper >>> (i * 4)) & 0xf) | ((halfGridUpper >>> (12 + i * 4)) & 0xf0)
            | ((halfGridLower << 8 >>> (4 * i)) & 0xf00) | (halfGridLower >>> (4 + i * 4) & 0xf000);

        newUpper |= this.toBottomUpper[col] << (i * 4);
        newLower |= this.toBottomLower[col] << (i * 4);
        merges += this.merges[col];
    }

    var res = {u: newUpper,
            l: newLower,
            merges: merges};

    return res;

}

AI.prototype.executeMove = function(direction, upper, lower){
    switch (direction){
        case 0:
            return this.moveUp(upper, lower);
        case 1:
            return this.moveRight(upper, lower);
        case 2:
            return this.moveDown(upper, lower);
        case 3:
            return this.moveLeft(upper, lower);
    }
}

AI.prototype.freeCells = function(upper, lower){
    var mask = 0xf;
    var count = 0;
    for (var i = 0; i < 8; i++){
        count += (upper & mask) == 0;
        count += (lower & mask) == 0;
        mask << 4;
    }
    return count;
}


function decode(state){
    var res = "";
    for (var i = 0; i < 8; i++){
        res += state >>> i * 4 & 0xf + "     ";
        if (i == 3 || i == 7){
            res += "\n";
        }
    }
    return res;
}

function decode2(state1, state2){
    console.log("\n" + decode(state1) + decode(state2));
}

