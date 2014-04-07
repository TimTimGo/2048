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
var maxDepth = 3;
// search depth upper bound
var maxDHigh = 4;
// search depth lower bound
var maxDLow = 3;

var actions = [0, 1, 2, 3]

function AI(gameManager){

    this.gameManager = gameManager;
    this.run = false;

    //connect to UI
    gameManager.inputManager.bindButtonPress(".step-ai", this.step.bind(this));
    gameManager.inputManager.bindButtonPress(".start-ai", this.start.bind(this));
    gameManager.inputManager.bindButtonPress(".stop-ai", this.stop.bind(this));

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
    var state = new GameState(this.gameManager);

    //adaptive search depth
    var numFreeCells = state.grid.availableCells().length;
    if (numFreeCells <= 3){
        maxDepth = 5
    }else if (numFreeCells <= 7){
        maxDepth = maxDHigh;
    }else{
        maxDepth = maxDLow;
    }

    var decNode = this.getDecisionNode(state, maxDepth);
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
AI.prototype.getDecisionNode = function(state, remainingDepth){

    var node = new DecisionNode();

    var that = this;

    actions.forEach(function(option){
        var copy = state.clone();

        //execute move on clone
        var result = copy.executeMove(option);

        //Add move to possible actions only if
        //option is accepted by GameManager
        if (result.moved){
            node.decisions[option] = copy;
            node.merges[option] = result.numberOfMerges;
            if (copy.over && !copy.won){
                //if this move results in ending the game, give a penalty!
                node.merges[option] = -1000;
            }else{
                var possNode = that.getPossibilitiesNode(copy, remainingDepth - 1);
                node.children[option] = possNode;
                var merges;
                if (possNode){
                    merges = possNode.avgMerges + result.numberOfMerges;
                }else{
                    merges = result.numberOfMerges;
                }
                if (merges >= node.maxMerges){
                    node.maxMerges = merges;
                    node.maxOption = option;
                }
            }
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
AI.prototype.getPossibilitiesNode = function(state, remainingDepth){

    if (!remainingDepth){
        return false;
    }

    var node = new PossibilitiesNode();

    var freeCells = state.grid.availableCells();

    var count = 0;
    var sum = 0;
    var that = this;

    freeCells.forEach(function(cell){
        var copy = state.clone();
        //insert a new tile into the copy
        var tile = new Tile(cell, 2)
        copy.grid.insertTile(tile);
        //node.possibilities[cell] = copy;
        var decNode = that.getDecisionNode(copy, remainingDepth);
        node.children[cell] = decNode;
        count++;
        sum += decNode.maxMerges;
    });

    node.avgMerges = sum / count;

    return node;
}
