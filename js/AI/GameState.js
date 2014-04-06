/**
 * Created by Timo Kersten on 05.04.14.
 */

function GameState(gameManager){
    if (gameManager){
        this.size = gameManager.size;
        this.grid = this.cloneGrid(gameManager.grid);
    }
}

//GameState inherits from GameManager
GameState.prototype = Object.create(GameManager.prototype);

GameState.prototype.cloneGrid = function(grid){
    return new Grid(grid.size, grid.serialize().cells);
}

GameState.prototype.clone = function(){
    var clone = new GameState();
    clone.size = this.size;
    clone.grid = this.cloneGrid(this.grid);
    return clone;
}