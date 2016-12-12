(function(){
  "use strict";
  
  var Moonlight = function( ){ this.init( "moonlight" ); };
  _.extend( Moonlight.prototype , {
    // Constants 
    cloudCounter : 100,
    
    // Scene Elements 
    stage  : undefined ,
    clouds : [],
    moon   : undefined,
 
    init : function( canvas ){
      this.stage = new createjs.Stage( canvas ) ;
      createjs.Ticker.setFPS( 40 );
      window.onresize  = _.debounce( _.bind( this.resize, this), 100 ) ;
      this.moon = SceneFactory.getMoon( this.stage ) ;
      this.stage.addChild( this.moon.container ) ;
      this.resize() ;
      createjs.Ticker.addEventListener( 'tick', _.bind( this.tick, this ) ) ;
    }, 
    
    resize : function( ){
      this.width( window.innerWidth ) ;
       var tmp; 
       var count = Math.floor( this.width() / this.cloudCounter ) ;
      if( count > this.clouds.length ){
        for( var i = this.clouds.length ; i < count ; i++){
          tmp = SceneFactory.getCloud( this.stage ) ;
          this.stage.addChild( tmp.container) ; 
          this.clouds.push( tmp ) ;
        }
      } else {
        while( this.clouds.length > count ){
          tmp = this.clouds.pop( ) ;
          this.stage.removeChild( tmp.container ) ;
        }
      }
      this.stage.update() ;
    },
    
    tick : function(){
      var occlusion = 0 ;
      for( var i =0 ; i < this.clouds.length; i++ ){
        occlusion += this.clouds[i].update( this.moon.pos(), this.width() ) ;
      }
      
      if( occlusion > 0 ){
        // Known Flaw: The occlusion calculation uses additive shapes not composite shapes.
        // If two clouds occupy the same space, their occlusion is still added consecutively.
        // it's inexact, but close enough to produce the effect without slowing down the client.
         this.moon.setBrilliance( this.moon.maxBrilliance - ( this.moon.maxBrilliance * occlusion / this.moon.totalArea ) );
      } else {
        this.moon.setBrilliance( this.moon.maxBrilliance );
      }
      
      this.stage.update() ;
    },
    
    width: function( ){
      if( arguments.length === 1){
        this.stage.canvas.width = arguments[0] ;
      }
      return this.stage.canvas.width;
    }
    
  }) ;
  
  
  var Cloud = function( ){ };
  _.extend( Cloud.prototype , {
    // constants 
    MAX_BRIGHT : .2 , 
    MAX_SHADOW : .6 , 
    MAX_COLOR  : .2 , 
    
    
    container : undefined ,
    shadow    : undefined ,
    color     : undefined ,
    light     : undefined ,
    wind      : 0 ,
    width     : 100 ,
    height    : 40 ,
    

    update : function( moonPosition, canvasWidth ){
      this.container.x += this.wind ;
      if( this.container.x > canvasWidth ){
        this.container.x = this.width * -1 ;
        this.container.y = getRandomFloat( 0 , 400 ) ;
        this.container.scaleX = this.container.scaleY = getRandomFloat( 0.4, 1.2 );
      }
      
      var distanceX = Math.abs( this.container.x - moonPosition.x ) ;
      var distanceY = Math.abs( this.container.y - moonPosition.y ) ;
      var ratio = Math.sqrt( Math.pow( distanceX , 2 ) + Math.pow( distanceY , 2 ) ) / 300;
      
      this.setBrightness( ratio * this.MAX_BRIGHT ) ;
      this.setSaturation( ratio * this.MAX_COLOR ) ;
      this.setShadow( 1 - ratio * this.MAX_SHADOW ) ;
      if( distanceX < this.width * 3 ){
        return this.getMoonOcclusion( moonPosition ) ; 
      }
      return 0 ;
    },
    
    getMoonOcclusion : function ( pos ){
      var moon_x1 = pos.x , 
          moon_y1 = pos.y , 
          moon_x2 = pos.x + 100 , 
          moon_y2 = pos.y + 100 , 
          cloud_x1 = this.container.x , 
          cloud_y1 = this.container.y , 
          cloud_x2 = this.container.x + ( this.width * this.container.scaleX ), 
          cloud_y2 = this.container.y + ( this.height * this.container.scaleY);
      
      var x_overlap = Math.max( 0, Math.min( moon_x2, cloud_x2) - Math.max( moon_x1, cloud_x1 ) )
      var y_overlap = Math.max( 0, Math.min( moon_y2, cloud_y2) - Math.max( moon_y1, cloud_y1 ) );
      
      return x_overlap * y_overlap ;
    },
    
    setBrightness : function( level ){
      this.light.alpha = clamp( level , this.light.alpha - 0.01, this.light.alpha + 0.01 ) ; ;
    },
    
    setShadow : function( level ){
      this.shadow.alpha = clamp( level , this.shadow.alpha - 0.01, this.shadow.alpha + 0.01 ) ;
    },
    
    setSaturation : function( level ){ 
      this.color.alpha = clamp( level , this.color.alpha - 0.01, this.color.alpha + 0.01 ) ;
    }
    
  }) ;
  
var Moon = function(){ this.init() ; };
_.extend( Moon.prototype , {
  
  phase         : -0.3 ,
  minPhase      : 1.02 ,
  movement      : .001 ,
  maxBrilliance : .6 ,
  totalArea     : 10000 ,

  
  glow : undefined,
  moon : undefined,
  
  init : function( ){
    this.rise = _.bind( this._rise, this ) ;
    createjs.Ticker.addEventListener( "tick", this.rise ) ;
  },
  
  rise  : undefined ,
  _rise : function( ){
    var s = Math.sin( this.phase += .001 );
    var w = window.sim.width() ;
    this.container.x = ( w / 2 ) + s * ( w / 4 ); 
    this.container.y = 600 - s * 400 ;
    if( this.phase > this.minPhase ){
      createjs.Ticker.removeEventListener( "tick", this.rise ) ;
    }
  },
  
  setBrilliance : function( level ) {
     this.glow.alpha = level ;
  },
  
  pos : function( ){
    return   { x : this.container.x - 50, y : this.container.y - 50 } ;
  }

}) ;
  
 // Keep all rendering code in the factory as it's 
 // fairly ugly and confuses the animation code.
 var SceneFactory = {
   
   CLOUD_BASE   : "#b9bfd5" ,
   CLOUD_SHADOW : "#646b8a" ,
   MOON         : "#faf9e1" ,
   MOONGLOW_C     : [ "rgba(250,249,225,0)", "rgba(250,249,225,1)", "rgba(1,6,29,0)" ] ,
   MOONGLOW_R     : [ .01, .2, 1 ] ,
   
   getCloud : function( stage ){
     var cloud = new Cloud() ;
     var vectors = this.clouds[ getRandomInt( 0, this.clouds.length )]; 
     
     cloud.container = new createjs.Container() ;
     
     cloud.wind = getRandomFloat( 0.05, 1.2 ) ;
     cloud.light = createShape( "#fff", vectors.base ) ;
     cloud.color = createCompositeShape( [this.CLOUD_BASE, this.CLOUD_SHADOW], [vectors.base, vectors.shadow] );
     cloud.shadow = createShape( "#01061d", vectors.base, 1, "#01061d" ) ;
     cloud.setShadow( 1 ) ;
     cloud.setBrightness( 0 ) ;
     
     cloud.container.addChild( cloud.light ) ;
     cloud.container.addChild( cloud.color ) ;
     cloud.container.addChild( cloud.shadow ) ;
     cloud.width = vectors.width ; 
     cloud.height = vectors.height ;
     cloud.container.x = getRandomFloat( 0 , stage.canvas.width ) ;
     cloud.container.y = getRandomFloat( 0 , stage.canvas.height - vectors.height ) ;
     cloud.container.scaleX = cloud.container.scaleY = getRandomFloat( 0.4, 1.2 );
     return cloud ;
   },
   
   getMoon : function( stage ){
     //         actually, it's full...
     var moon = new Moon( ) ;
     moon.container = new createjs.Container() ;
     
     moon.glow = new createjs.Shape() ;
     moon.glow.graphics.rf( this.MOONGLOW_C, this.MOONGLOW_R, 0, 0, 0, 0, 0, 300).dc( 0, 0, 300, 300 ).ef();
     
     moon.moon = new createjs.Shape() ;
     moon.moon.graphics.f( this.MOON ).dc( 0, 0, 50, 50 ).ef();
     
     moon.container.addChild( moon.glow );
     moon.container.addChild( moon.moon ) ;
     moon.container.x = ( stage.canvas.width / 2 ) ;
     moon.container.y = ( stage.canvas.height )  ;
     moon.setBrilliance( 0.4 );
     return moon ;
   },

   
   clouds: [
    {
      width: 178,
      height: 21,
      base : "AAACWYAAgyB4AKAAAAYAAAAAAhGC0AAYC0AACqAeAAAAYAAAAgegeAogKYAegKBaAeAKgKYAKAAgogoAoAAYGuAAg8AUCqAoYFAgUgKCCEYAUYi+Aym4hagKAUYA8AKBuAeAKAKYAUAKiMgKAUAKYCqAUDwAAAAAKYigAKBGAKhuAKYh4AKn+gUAAgKYgKgUFKAAAAAAYAAAAjwgUhaAKYhQAKhkgokOAeYgoAABGgoCMAAYgogUkOAAgUAAYgKgKAAgUAAAAYAAAAksAKgUgK", 

      shadow : ""
    },
    {
      width: 311,
      height: 30,
      base : "ACCAKYAAgKEEAAAUAKYAUAKhaAKAUAKYAKAAC0AKBaAAYBaAAEigyDSAAYDIAAKUAyAoAoYAoAojSgogyAeYgUAKCMgKCgAKYBaAKBGAeB4AAYA8AAAygeA8AKYCgAABuAoAyAoYiCAKgKAKgeAAYgeAKCgAUA8AKYA8AKBQgegKgUYgKgKkiAUA8gKYA8gUAeAAAAAAYAAAAksAAh4AKYh4AKiggUhuAAYh4AKAAAKhQAAYhaAAhagoiMAAYiMAAigAeh4AAYhuAAiWgeg8AAYgygKpYgKgyAAYgyAAifAAATgoYAegoAeAAAUgKYAegKFeAAAyAKYA8AUFAAAAKgUYAAgUoIgUgUgKYgKgKAUAAgUAAYgUgKgoAKgeAAYgoAAhagUAAgK", 
      shadow : "AIIBGYDSgKBkgeE2gKYEsgUJsBQAAAAYAAAArGg8h4AoYiCAoTiAyAyAoYA8Ae0yiqpiAU"
    },
    {
      width: 143,
      height: 20,
      base : "AAACqYAUAAB4gKBuAAYBaAABQAAAAAAYAAAABuAeAUAAYAUAAAKgKAKAAYAKAAAUAUAUAAYAUAKAKgeAAAAYAAAAAKAUAeAAYAeAAAAgUAKAAYAKAABGAAAKAAYAKAKgKAAAUAAYAKAAAKgUAAAAYAKAAAogKAeAAYAUAAA8AKAUAAYAUAAA8AAAeAAYAeAAAUAAAoAAYAeAACCAKAKgKYAAAAiWgUhGAAYiWAAhGgUgKAAYgKAAAAgKgKAAYgUAAgKAKgeAAYgeAAgegKgKAAYAAAAgKgKgeAKYAAgUgegKgKgKYgKgUgUgUgUAAYAAgUgUgKgeAAYgeAAgyBGAUAeYgUgKgyAUgKAUYgKAAiqAAhaAAYhaAAiWAKAAAU", 
      shadow : ""
    },
    {
      width: 105,
      height: 40,
      base : "AQkGGYAUAKiggKhGgKYhGAAhaAeg8gKYg8AAg8gKhGAAYhQgKiWAUgKAAYgKAAAAgKgKAAYgKAAgUAKgKAAYgKAAgUAAgKgKYgKAKgUAAAAAAYAAAAhGAKAKgoYAAgoAUgeAUAKYgKgeAKgeAKgKYAUgKAegKAKAKYgUgeAUgUAAAAYAAAAAegKAKAKYAAgUAKgKAUAAYAKAAAUAKAAAKYAegKAUAKAKAKYAKAUAAAegKAKYAKAUAAgKAeAKYgKgKAKgogKgKYgegeAKgoAKAAYg8AAgKgeAAgUYAUg8BGAUAKAUYAAgoAUAKAAAAYAAAAAogKAAAKYAAgUAUAAAAAAYAAAAA8AAAKAoYAKAUgKAKAAAAYAeAAAAAeAAAKYAogKAKAeAAAKYAKAUgeAUgKAKYAAAUAyAUAKAUYAygoAeAyAAAUYAogUAoAAAKAUYAUgoAKA8AKAKYAyAAAeAKAUAAYAUAABuAyAeAK", 
      shadow : ""
    },
    {
      width: 99,
      height: 30,
      base : "AAAC+YAAgeAUgKAUAAYAAgeAoAAAKAKYAAgeAUAAAKgKYAAgoAUgKAKAAYAAgUAoAAAAAAYAAAAgKgUAUAAYAUAAAKAKAAAKYAegKAAAygKAAYBGgoAKA8gKAUYA8gKAAAyAAAKYAAAKAUAKAAAAYAegyAKAUAKAKYAehGAeAKAKAAYAegeAAAoAKAAYAAAKAKAAAAgKYAKgUAAgKAUgKYAeAAAUAegKAKYAUgKAeAeAAAAYAAAAAKgoAUAAYAUAAAKAeAAAKYAegUAeAoAAAAYAeAAgeAeAogKYAogKAeAUAKAKYAUgKAeAKAAAUYgKAKgygUgKAKYgUAehGgKAAgKYgUAegogUgKAAYgeAogUgegKAAYgUAAgyAAgegKYAAAUgoAKgKAAYgKAygegKgKgUYgUAKgegoAAAAYAAAAgoA8gegKYgeAAAAgegKgKYgoAUgUgegKgKYgeBQgehGgUAKYgeAKgogegKgKYgeAKgUgeAAAAYAAAAgoAKgKgU", 
      shadow : ""
    },
    {
      width: 155,
      height: 55,
      base : "AXwIIYAeAAAAgogKAAYAAgKhugUgKAAYgKAAAAgKgKAAYgKAAgKAAgKAUYgKgKAAgKgUgKYgKgKgKAUgKAAYgKAAgKgKgKAAYgKAAgKAAgKAUYgKgUgUAKAAAAYAAAAgUAAgKAKYAAgKgogegKAKYAAgegUAAgKAAYgUAKgUAKAAAAYAAAAAAgyhQAKYgUgegUAAgoAKYgUgegUAAgoAKYgKgogogKgUAAYAKgygKAAgogUYgogUgyAUgKAeYgogogyAygKAUYgegygeAUgUAUYAAgKAAgUgUAKYAAgKAKgUgUgKYAygegKgUAAgeYgKgegogygeAKYgeg7gyAJgoAUYg8gdgoAdgeAKYgeAUAKA8AAAKYgeAKAKAyAAAAYAAAAgUAUAKAyYg8gKgKAoAAAKYAABGAyA8AAAeYgUAAgKAoAAAAYAAAAA8AUAeAKYAeAKI6gKAeAAYAeAACqAKAUAAYAKAAAAgKAUAAYAKAAAoAeAegKYAUAAAUgKAeAAYAUAAFKgKAeAA", 
      shadow : ""
    },
    {
      width: 138,
      height: 26,
      base : "AAADmYAUAKGkgKAKAAYAKAKAKAKAUAAYAKAAAUgKAUgKYAUAKAeAUAKAAYAKgKAKAAAKgKYAAAAAKAKAKAAYAKAAAKgKAKgKYAAAKAKAKAUAAYAKAAAKgKAKAAYAKAKAKAAAKAAYAKAAAUgKAKgUYAUAUA8AAAAAAYAAAAAUAKAKAAYAKAAAKgKAAAAIAoAAYAAAAAKAAAKAAIAegKYAAAAAUAUAKAAYAKAAAUgKAAAAYAAAABQgUAKAAYAUAACqAKAAgKYAKAAhuAAAAgKYgKAAg8gKAAAAYgKgKAAgUgKAAYgKAKgKAKAAAAYAAAAhaAAgKAKYgKgKgKgUgKAAYgKAAAAAAgKAKYgUgKgygUgKAAYgKAAgKAAgKAUYAAgKgUAAgUAAYAKgKgKgKAAgKYgKgKgKAAgKAAYAAAAgUgUgKAKYgKAAAAgKAKgUYAKgKAAgKgUgKYAKgUgKgKAAAAYgKgKgUgTgeAdYAAgUgUgJgUATYgeAUAeAeAAAAYAAAKgUAUAAAKYAAAKAKAAAAAKIgKAKYAAAKAKAAAAAKYAAAAgUAKAAgKYgKAAAKgUAAgUYAAgKAAgegeAAYgKAAgUAKgKAKYgogKhQAegKAyYgKAKgUAKgKAUYgKAAAKAAgoAKYgeAKleAAAAAK", 
      shadow : "AKyAoYAAAAAKgeAKAAYAKAKAKAUAAAAYAAAAAUgoAKAUYAUAKAAAUAAAAYAAAAAAAAgUgUYgUgUgKAoAAAAYAAAAAAAoAUAKYAKgUAeAUgKAeYAAhGgyAoAAAeYgKgygUAKAAAKYAKgeAUAoAAAAYAAAAgKhGgUAoYAKgoAUAoAAAAYAAAAAAhGgUAUYAAgKgUAUAAAA"
    },
    {
      width: 138,
      height: 26,
      base : "AXmKKYgyAKhuAAgeAAYgoAAgKgKgoAAYgeAAgeAeiWgUYgeAUhQgUgKAKYgKAUgUgUAAAAYAAAAgUAUgUgUYgoAygegoAAAAYAAAAgeAAgUgUYgKAUgUAAgKgKYgKAUgUAAgUgKYgyAUgegUgKgUYgoAogogegKgKYg8AogygoAAAAYAAAAhGAAgUgUYgoBGgohGgUAAYhGAygehQgKgUYgUgoAAgUAKgKYgUgeAAgyAAgKYAKgUAoAAAKAAYAKg8AUgUAUAAYAUAAAAAKAKAAYAKAAAKgUAAgKYAAgKgygeAAgKYAAgUAKgKAUAAYAKAAAUAAAKAKYgUgyAegUAKgKYgegKgKgeAAgUYAKgUAeAAAKAKYgKhQA8AeAKgKYAKgeAoAUAAAAYAAAAAUgUAeAAYAeAKgUA8AAAAYAAAAAyhGA8AyYAoAUAKAUAAAUYgKAUhGAygKAAYAeA8haAoAKAKYBGA8g8AKAAAKYAyAKAAAeAKAKYAogKAKAUAAAUYBGAAAyAUgUAyYAeAAAAAKAKAKYAUgKAKAKAKAKYAUgKAUAUAKAAYAoAAAUAKAKgKYAogoAUAyAAAKYAUgoAeAeAKAKYAegUAKAKAAAKYA8gegKAeAKAKYAogeAKAeAAAKYAogeAUAUAAAKYAegUAAAUAKAKYAUAKAeAAAAAAYAUgoAoAeAKAAYAKAAAAAUAAAAYAAAAAUgUAKAUYAUAKBkgeAoAo", 
      shadow : "ABGHCYAAAAAUhuCCBQYBugehuighGCMYgKhkCMAyAAAAYAAAAgejmhGCqYAKgeAAhGBuAUYgogogoAKAAgKYhugoBuAAAAAAYAAAAAUhGAeAyYAUhQAUA8AAAAYAAAAAyg8AABQYCgg8gKA8AAAUYgUhQh4BGgUAeYAKgUgKgoAAAAYAAAAAKgegeAoYgUAUgUhagUBQYgegUgKAeAAAUYhagKBQAoAKAAYAAAKAohaA8BGYhkgyAoBQAAAAYAAAACMhGAUBuYhGiChaCMAKAUYBQhaAoBaAAAUYhQiCgeCWgUAUYA8g8AABaAAAAYAAAAAygyAeA8Yg8gogKA8AAAAYAAAABGAUAUAoYAKgUAoAeAAAUYAyAKB4AogyAeYAoAAAUAeAAAKYgogogoAKAAAAYAAAAAogegeAAYhahGgUAygUgKYAohahuAygKAKYBahajmgoA8BGYgogKAAA8AAAAYAAAABQgKAABGYAohQAKBGAAAAYAAAAg8gohGBQYBGgoh4iCgoB4YgUAUAKAogKgUYAUg8AAiWhuC+YAUgUgeg8gUAyYgUAAAKgKAKgKYAUgUAUAeAAAA"
    }
/*





*/
  ]
 }; 
  
  
/***************************
  Helpers
 ***************************/
  function createShape ( color, vector , strokeWidth, strokeColor){
    var shape = new createjs.Shape() ;
    if( strokeWidth && strokeColor ){
      shape.graphics.ss( strokeWidth ).s( strokeColor );
    }
    shape.graphics.f( color ).p( vector ).cp().ef();
    return shape ;
  }
  
  function createCompositeShape( colors, vectors ){
    var shape = new createjs.Shape() ;
    for( var i = 0; i < vectors.length ; i++ ){
      shape.graphics.f( colors[i] ).p( vectors[i] ).cp().ef();
    }
    return shape ;
  }
  
  function getRandomFloat( min, max ) {
    return Math.random() * ( max - min ) + min;
  }
  
  function getRandomInt( min, max ) {
    return Math.floor( getRandomFloat( min, max ) ) ;
  }
  
  function clamp( val, min, max ){
    return Math.max( min, Math.min( max, val ) ) ;
  }
  
  
/***************************
  Start Animation Sequence
 ***************************/
  window.onload = function(){ window.sim = new Moonlight(); };
})();
