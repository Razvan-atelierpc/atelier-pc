/* three.js r128 – extensii (MIT, https://github.com/mrdoob/three.js): EffectComposer, RenderPass, ShaderPass, CopyShader, GammaCorrectionShader, OutlinePass, RoomEnvironment, RoundedBoxGeometry */

/* ---- shaders/CopyShader.js ---- */
( function () {

	/**
 * Full-screen textured quad shader
 */
	var CopyShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'opacity': {
				value: 1.0
			}
		},
		vertexShader:
  /* glsl */
  `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader:
  /* glsl */
  `

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;

		}`
	};

	THREE.CopyShader = CopyShader;

} )();

/* ---- shaders/GammaCorrectionShader.js ---- */
( function () {

	/**
 * Gamma Correction Shader
 * http://en.wikipedia.org/wiki/gamma_correction
 */
	const GammaCorrectionShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			}
		},
		vertexShader:
  /* glsl */
  `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader:
  /* glsl */
  `

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 tex = texture2D( tDiffuse, vUv );

			gl_FragColor = LinearTosRGB( tex ); // optional: LinearToGamma( tex, float( GAMMA_FACTOR ) );

		}`
	};

	THREE.GammaCorrectionShader = GammaCorrectionShader;

} )();

/* ---- postprocessing/EffectComposer.js ---- */
( function () {

	class EffectComposer {

		constructor( renderer, renderTarget ) {

			this.renderer = renderer;

			if ( renderTarget === undefined ) {

				const parameters = {
					minFilter: THREE.LinearFilter,
					magFilter: THREE.LinearFilter,
					format: THREE.RGBAFormat
				};
				const size = renderer.getSize( new THREE.Vector2() );
				this._pixelRatio = renderer.getPixelRatio();
				this._width = size.width;
				this._height = size.height;
				renderTarget = new THREE.WebGLRenderTarget( this._width * this._pixelRatio, this._height * this._pixelRatio, parameters );
				renderTarget.texture.name = 'EffectComposer.rt1';

			} else {

				this._pixelRatio = 1;
				this._width = renderTarget.width;
				this._height = renderTarget.height;

			}

			this.renderTarget1 = renderTarget;
			this.renderTarget2 = renderTarget.clone();
			this.renderTarget2.texture.name = 'EffectComposer.rt2';
			this.writeBuffer = this.renderTarget1;
			this.readBuffer = this.renderTarget2;
			this.renderToScreen = true;
			this.passes = []; // dependencies

			if ( THREE.CopyShader === undefined ) {

				console.error( 'THREE.EffectComposer relies on THREE.CopyShader' );

			}

			if ( THREE.ShaderPass === undefined ) {

				console.error( 'THREE.EffectComposer relies on THREE.ShaderPass' );

			}

			this.copyPass = new THREE.ShaderPass( THREE.CopyShader );
			this.clock = new THREE.Clock();

		}

		swapBuffers() {

			const tmp = this.readBuffer;
			this.readBuffer = this.writeBuffer;
			this.writeBuffer = tmp;

		}

		addPass( pass ) {

			this.passes.push( pass );
			pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );

		}

		insertPass( pass, index ) {

			this.passes.splice( index, 0, pass );
			pass.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );

		}

		removePass( pass ) {

			const index = this.passes.indexOf( pass );

			if ( index !== - 1 ) {

				this.passes.splice( index, 1 );

			}

		}

		isLastEnabledPass( passIndex ) {

			for ( let i = passIndex + 1; i < this.passes.length; i ++ ) {

				if ( this.passes[ i ].enabled ) {

					return false;

				}

			}

			return true;

		}

		render( deltaTime ) {

			// deltaTime value is in seconds
			if ( deltaTime === undefined ) {

				deltaTime = this.clock.getDelta();

			}

			const currentRenderTarget = this.renderer.getRenderTarget();
			let maskActive = false;

			for ( let i = 0, il = this.passes.length; i < il; i ++ ) {

				const pass = this.passes[ i ];
				if ( pass.enabled === false ) continue;
				pass.renderToScreen = this.renderToScreen && this.isLastEnabledPass( i );
				pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive );

				if ( pass.needsSwap ) {

					if ( maskActive ) {

						const context = this.renderer.getContext();
						const stencil = this.renderer.state.buffers.stencil; //context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );

						stencil.setFunc( context.NOTEQUAL, 1, 0xffffffff );
						this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime ); //context.stencilFunc( context.EQUAL, 1, 0xffffffff );

						stencil.setFunc( context.EQUAL, 1, 0xffffffff );

					}

					this.swapBuffers();

				}

				if ( THREE.MaskPass !== undefined ) {

					if ( pass instanceof THREE.MaskPass ) {

						maskActive = true;

					} else if ( pass instanceof THREE.ClearMaskPass ) {

						maskActive = false;

					}

				}

			}

			this.renderer.setRenderTarget( currentRenderTarget );

		}

		reset( renderTarget ) {

			if ( renderTarget === undefined ) {

				const size = this.renderer.getSize( new THREE.Vector2() );
				this._pixelRatio = this.renderer.getPixelRatio();
				this._width = size.width;
				this._height = size.height;
				renderTarget = this.renderTarget1.clone();
				renderTarget.setSize( this._width * this._pixelRatio, this._height * this._pixelRatio );

			}

			this.renderTarget1.dispose();
			this.renderTarget2.dispose();
			this.renderTarget1 = renderTarget;
			this.renderTarget2 = renderTarget.clone();
			this.writeBuffer = this.renderTarget1;
			this.readBuffer = this.renderTarget2;

		}

		setSize( width, height ) {

			this._width = width;
			this._height = height;
			const effectiveWidth = this._width * this._pixelRatio;
			const effectiveHeight = this._height * this._pixelRatio;
			this.renderTarget1.setSize( effectiveWidth, effectiveHeight );
			this.renderTarget2.setSize( effectiveWidth, effectiveHeight );

			for ( let i = 0; i < this.passes.length; i ++ ) {

				this.passes[ i ].setSize( effectiveWidth, effectiveHeight );

			}

		}

		setPixelRatio( pixelRatio ) {

			this._pixelRatio = pixelRatio;
			this.setSize( this._width, this._height );

		}

	}

	class Pass {

		constructor() {

			// if set to true, the pass is processed by the composer
			this.enabled = true; // if set to true, the pass indicates to swap read and write buffer after rendering

			this.needsSwap = true; // if set to true, the pass clears its buffer before rendering

			this.clear = false; // if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.

			this.renderToScreen = false;

		}

		setSize( ) {}

		render( ) {

			console.error( 'THREE.Pass: .render() must be implemented in derived pass.' );

		}

	} // Helper for passes that need to fill the viewport with a single quad.


	const _camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 ); // https://github.com/mrdoob/three.js/pull/21358


	const _geometry = new THREE.BufferGeometry();

	_geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ - 1, 3, 0, - 1, - 1, 0, 3, - 1, 0 ], 3 ) );

	_geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( [ 0, 2, 0, 0, 2, 0 ], 2 ) );

	class FullScreenQuad {

		constructor( material ) {

			this._mesh = new THREE.Mesh( _geometry, material );

		}

		dispose() {

			this._mesh.geometry.dispose();

		}

		render( renderer ) {

			renderer.render( this._mesh, _camera );

		}

		get material() {

			return this._mesh.material;

		}

		set material( value ) {

			this._mesh.material = value;

		}

	}

	THREE.EffectComposer = EffectComposer;
	THREE.FullScreenQuad = FullScreenQuad;
	THREE.Pass = Pass;

} )();

/* ---- postprocessing/RenderPass.js ---- */
( function () {

	class RenderPass extends THREE.Pass {

		constructor( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

			super();
			this.scene = scene;
			this.camera = camera;
			this.overrideMaterial = overrideMaterial;
			this.clearColor = clearColor;
			this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
			this.clear = true;
			this.clearDepth = false;
			this.needsSwap = false;
			this._oldClearColor = new THREE.Color();

		}

		render( renderer, writeBuffer, readBuffer
			/*, deltaTime, maskActive */
		) {

			const oldAutoClear = renderer.autoClear;
			renderer.autoClear = false;
			let oldClearAlpha, oldOverrideMaterial;

			if ( this.overrideMaterial !== undefined ) {

				oldOverrideMaterial = this.scene.overrideMaterial;
				this.scene.overrideMaterial = this.overrideMaterial;

			}

			if ( this.clearColor ) {

				renderer.getClearColor( this._oldClearColor );
				oldClearAlpha = renderer.getClearAlpha();
				renderer.setClearColor( this.clearColor, this.clearAlpha );

			}

			if ( this.clearDepth ) {

				renderer.clearDepth();

			}

			renderer.setRenderTarget( this.renderToScreen ? null : readBuffer ); // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600

			if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			renderer.render( this.scene, this.camera );

			if ( this.clearColor ) {

				renderer.setClearColor( this._oldClearColor, oldClearAlpha );

			}

			if ( this.overrideMaterial !== undefined ) {

				this.scene.overrideMaterial = oldOverrideMaterial;

			}

			renderer.autoClear = oldAutoClear;

		}

	}

	THREE.RenderPass = RenderPass;

} )();

/* ---- postprocessing/ShaderPass.js ---- */
( function () {

	class ShaderPass extends THREE.Pass {

		constructor( shader, textureID ) {

			super();
			this.textureID = textureID !== undefined ? textureID : 'tDiffuse';

			if ( shader instanceof THREE.ShaderMaterial ) {

				this.uniforms = shader.uniforms;
				this.material = shader;

			} else if ( shader ) {

				this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );
				this.material = new THREE.ShaderMaterial( {
					defines: Object.assign( {}, shader.defines ),
					uniforms: this.uniforms,
					vertexShader: shader.vertexShader,
					fragmentShader: shader.fragmentShader
				} );

			}

			this.fsQuad = new THREE.FullScreenQuad( this.material );

		}

		render( renderer, writeBuffer, readBuffer
			/*, deltaTime, maskActive */
		) {

			if ( this.uniforms[ this.textureID ] ) {

				this.uniforms[ this.textureID ].value = readBuffer.texture;

			}

			this.fsQuad.material = this.material;

			if ( this.renderToScreen ) {

				renderer.setRenderTarget( null );
				this.fsQuad.render( renderer );

			} else {

				renderer.setRenderTarget( writeBuffer ); // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600

				if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
				this.fsQuad.render( renderer );

			}

		}

	}

	THREE.ShaderPass = ShaderPass;

} )();

/* ---- postprocessing/OutlinePass.js ---- */
( function () {

	class OutlinePass extends THREE.Pass {

		constructor( resolution, scene, camera, selectedObjects ) {

			super();
			this.renderScene = scene;
			this.renderCamera = camera;
			this.selectedObjects = selectedObjects !== undefined ? selectedObjects : [];
			this.visibleEdgeColor = new THREE.Color( 1, 1, 1 );
			this.hiddenEdgeColor = new THREE.Color( 0.1, 0.04, 0.02 );
			this.edgeGlow = 0.0;
			this.usePatternTexture = false;
			this.edgeThickness = 1.0;
			this.edgeStrength = 3.0;
			this.downSampleRatio = 2;
			this.pulsePeriod = 0;
			this._visibilityCache = new Map();
			this.resolution = resolution !== undefined ? new THREE.Vector2( resolution.x, resolution.y ) : new THREE.Vector2( 256, 256 );
			const pars = {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat
			};
			const resx = Math.round( this.resolution.x / this.downSampleRatio );
			const resy = Math.round( this.resolution.y / this.downSampleRatio );
			this.maskBufferMaterial = new THREE.MeshBasicMaterial( {
				color: 0xffffff
			} );
			this.maskBufferMaterial.side = THREE.DoubleSide;
			this.renderTargetMaskBuffer = new THREE.WebGLRenderTarget( this.resolution.x, this.resolution.y, pars );
			this.renderTargetMaskBuffer.texture.name = 'OutlinePass.mask';
			this.renderTargetMaskBuffer.texture.generateMipmaps = false;
			this.depthMaterial = new THREE.MeshDepthMaterial();
			this.depthMaterial.side = THREE.DoubleSide;
			this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
			this.depthMaterial.blending = THREE.NoBlending;
			this.prepareMaskMaterial = this.getPrepareMaskMaterial();
			this.prepareMaskMaterial.side = THREE.DoubleSide;
			this.prepareMaskMaterial.fragmentShader = replaceDepthToViewZ( this.prepareMaskMaterial.fragmentShader, this.renderCamera );
			this.renderTargetDepthBuffer = new THREE.WebGLRenderTarget( this.resolution.x, this.resolution.y, pars );
			this.renderTargetDepthBuffer.texture.name = 'OutlinePass.depth';
			this.renderTargetDepthBuffer.texture.generateMipmaps = false;
			this.renderTargetMaskDownSampleBuffer = new THREE.WebGLRenderTarget( resx, resy, pars );
			this.renderTargetMaskDownSampleBuffer.texture.name = 'OutlinePass.depthDownSample';
			this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps = false;
			this.renderTargetBlurBuffer1 = new THREE.WebGLRenderTarget( resx, resy, pars );
			this.renderTargetBlurBuffer1.texture.name = 'OutlinePass.blur1';
			this.renderTargetBlurBuffer1.texture.generateMipmaps = false;
			this.renderTargetBlurBuffer2 = new THREE.WebGLRenderTarget( Math.round( resx / 2 ), Math.round( resy / 2 ), pars );
			this.renderTargetBlurBuffer2.texture.name = 'OutlinePass.blur2';
			this.renderTargetBlurBuffer2.texture.generateMipmaps = false;
			this.edgeDetectionMaterial = this.getEdgeDetectionMaterial();
			this.renderTargetEdgeBuffer1 = new THREE.WebGLRenderTarget( resx, resy, pars );
			this.renderTargetEdgeBuffer1.texture.name = 'OutlinePass.edge1';
			this.renderTargetEdgeBuffer1.texture.generateMipmaps = false;
			this.renderTargetEdgeBuffer2 = new THREE.WebGLRenderTarget( Math.round( resx / 2 ), Math.round( resy / 2 ), pars );
			this.renderTargetEdgeBuffer2.texture.name = 'OutlinePass.edge2';
			this.renderTargetEdgeBuffer2.texture.generateMipmaps = false;
			const MAX_EDGE_THICKNESS = 4;
			const MAX_EDGE_GLOW = 4;
			this.separableBlurMaterial1 = this.getSeperableBlurMaterial( MAX_EDGE_THICKNESS );
			this.separableBlurMaterial1.uniforms[ 'texSize' ].value.set( resx, resy );
			this.separableBlurMaterial1.uniforms[ 'kernelRadius' ].value = 1;
			this.separableBlurMaterial2 = this.getSeperableBlurMaterial( MAX_EDGE_GLOW );
			this.separableBlurMaterial2.uniforms[ 'texSize' ].value.set( Math.round( resx / 2 ), Math.round( resy / 2 ) );
			this.separableBlurMaterial2.uniforms[ 'kernelRadius' ].value = MAX_EDGE_GLOW; // Overlay material

			this.overlayMaterial = this.getOverlayMaterial(); // copy material

			if ( THREE.CopyShader === undefined ) console.error( 'THREE.OutlinePass relies on THREE.CopyShader' );
			const copyShader = THREE.CopyShader;
			this.copyUniforms = THREE.UniformsUtils.clone( copyShader.uniforms );
			this.copyUniforms[ 'opacity' ].value = 1.0;
			this.materialCopy = new THREE.ShaderMaterial( {
				uniforms: this.copyUniforms,
				vertexShader: copyShader.vertexShader,
				fragmentShader: copyShader.fragmentShader,
				blending: THREE.NoBlending,
				depthTest: false,
				depthWrite: false,
				transparent: true
			} );
			this.enabled = true;
			this.needsSwap = false;
			this._oldClearColor = new THREE.Color();
			this.oldClearAlpha = 1;
			this.fsQuad = new THREE.FullScreenQuad( null );
			this.tempPulseColor1 = new THREE.Color();
			this.tempPulseColor2 = new THREE.Color();
			this.textureMatrix = new THREE.Matrix4();

			function replaceDepthToViewZ( string, camera ) {

				var type = camera.isPerspectiveCamera ? 'perspective' : 'orthographic';
				return string.replace( /DEPTH_TO_VIEW_Z/g, type + 'DepthToViewZ' );

			}

		}

		dispose() {

			this.renderTargetMaskBuffer.dispose();
			this.renderTargetDepthBuffer.dispose();
			this.renderTargetMaskDownSampleBuffer.dispose();
			this.renderTargetBlurBuffer1.dispose();
			this.renderTargetBlurBuffer2.dispose();
			this.renderTargetEdgeBuffer1.dispose();
			this.renderTargetEdgeBuffer2.dispose();

		}

		setSize( width, height ) {

			this.renderTargetMaskBuffer.setSize( width, height );
			this.renderTargetDepthBuffer.setSize( width, height );
			let resx = Math.round( width / this.downSampleRatio );
			let resy = Math.round( height / this.downSampleRatio );
			this.renderTargetMaskDownSampleBuffer.setSize( resx, resy );
			this.renderTargetBlurBuffer1.setSize( resx, resy );
			this.renderTargetEdgeBuffer1.setSize( resx, resy );
			this.separableBlurMaterial1.uniforms[ 'texSize' ].value.set( resx, resy );
			resx = Math.round( resx / 2 );
			resy = Math.round( resy / 2 );
			this.renderTargetBlurBuffer2.setSize( resx, resy );
			this.renderTargetEdgeBuffer2.setSize( resx, resy );
			this.separableBlurMaterial2.uniforms[ 'texSize' ].value.set( resx, resy );

		}

		changeVisibilityOfSelectedObjects( bVisible ) {

			const cache = this._visibilityCache;

			function gatherSelectedMeshesCallBack( object ) {

				if ( object.isMesh ) {

					if ( bVisible === true ) {

						object.visible = cache.get( object );

					} else {

						cache.set( object, object.visible );
						object.visible = bVisible;

					}

				}

			}

			for ( let i = 0; i < this.selectedObjects.length; i ++ ) {

				const selectedObject = this.selectedObjects[ i ];
				selectedObject.traverse( gatherSelectedMeshesCallBack );

			}

		}

		changeVisibilityOfNonSelectedObjects( bVisible ) {

			const cache = this._visibilityCache;
			const selectedMeshes = [];

			function gatherSelectedMeshesCallBack( object ) {

				if ( object.isMesh ) selectedMeshes.push( object );

			}

			for ( let i = 0; i < this.selectedObjects.length; i ++ ) {

				const selectedObject = this.selectedObjects[ i ];
				selectedObject.traverse( gatherSelectedMeshesCallBack );

			}

			function VisibilityChangeCallBack( object ) {

				if ( object.isMesh || object.isSprite ) {

					// only meshes and sprites are supported by OutlinePass
					let bFound = false;

					for ( let i = 0; i < selectedMeshes.length; i ++ ) {

						const selectedObjectId = selectedMeshes[ i ].id;

						if ( selectedObjectId === object.id ) {

							bFound = true;
							break;

						}

					}

					if ( bFound === false ) {

						const visibility = object.visible;

						if ( bVisible === false || cache.get( object ) === true ) {

							object.visible = bVisible;

						}

						cache.set( object, visibility );

					}

				} else if ( object.isPoints || object.isLine ) {

					// the visibilty of points and lines is always set to false in order to
					// not affect the outline computation
					if ( bVisible === true ) {

						object.visible = cache.get( object ); // restore

					} else {

						cache.set( object, object.visible );
						object.visible = bVisible;

					}

				}

			}

			this.renderScene.traverse( VisibilityChangeCallBack );

		}

		updateTextureMatrix() {

			this.textureMatrix.set( 0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0 );
			this.textureMatrix.multiply( this.renderCamera.projectionMatrix );
			this.textureMatrix.multiply( this.renderCamera.matrixWorldInverse );

		}

		render( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

			if ( this.selectedObjects.length > 0 ) {

				renderer.getClearColor( this._oldClearColor );
				this.oldClearAlpha = renderer.getClearAlpha();
				const oldAutoClear = renderer.autoClear;
				renderer.autoClear = false;
				if ( maskActive ) renderer.state.buffers.stencil.setTest( false );
				renderer.setClearColor( 0xffffff, 1 ); // Make selected objects invisible

				this.changeVisibilityOfSelectedObjects( false );
				const currentBackground = this.renderScene.background;
				this.renderScene.background = null; // 1. Draw Non Selected objects in the depth buffer

				this.renderScene.overrideMaterial = this.depthMaterial;
				renderer.setRenderTarget( this.renderTargetDepthBuffer );
				renderer.clear();
				renderer.render( this.renderScene, this.renderCamera ); // Make selected objects visible

				this.changeVisibilityOfSelectedObjects( true );

				this._visibilityCache.clear(); // Update Texture Matrix for Depth compare


				this.updateTextureMatrix(); // Make non selected objects invisible, and draw only the selected objects, by comparing the depth buffer of non selected objects

				this.changeVisibilityOfNonSelectedObjects( false );
				this.renderScene.overrideMaterial = this.prepareMaskMaterial;
				this.prepareMaskMaterial.uniforms[ 'cameraNearFar' ].value.set( this.renderCamera.near, this.renderCamera.far );
				this.prepareMaskMaterial.uniforms[ 'depthTexture' ].value = this.renderTargetDepthBuffer.texture;
				this.prepareMaskMaterial.uniforms[ 'textureMatrix' ].value = this.textureMatrix;
				renderer.setRenderTarget( this.renderTargetMaskBuffer );
				renderer.clear();
				renderer.render( this.renderScene, this.renderCamera );
				this.renderScene.overrideMaterial = null;
				this.changeVisibilityOfNonSelectedObjects( true );

				this._visibilityCache.clear();

				this.renderScene.background = currentBackground; // 2. Downsample to Half resolution

				this.fsQuad.material = this.materialCopy;
				this.copyUniforms[ 'tDiffuse' ].value = this.renderTargetMaskBuffer.texture;
				renderer.setRenderTarget( this.renderTargetMaskDownSampleBuffer );
				renderer.clear();
				this.fsQuad.render( renderer );
				this.tempPulseColor1.copy( this.visibleEdgeColor );
				this.tempPulseColor2.copy( this.hiddenEdgeColor );

				if ( this.pulsePeriod > 0 ) {

					const scalar = ( 1 + 0.25 ) / 2 + Math.cos( performance.now() * 0.01 / this.pulsePeriod ) * ( 1.0 - 0.25 ) / 2;
					this.tempPulseColor1.multiplyScalar( scalar );
					this.tempPulseColor2.multiplyScalar( scalar );

				} // 3. Apply Edge Detection THREE.Pass


				this.fsQuad.material = this.edgeDetectionMaterial;
				this.edgeDetectionMaterial.uniforms[ 'maskTexture' ].value = this.renderTargetMaskDownSampleBuffer.texture;
				this.edgeDetectionMaterial.uniforms[ 'texSize' ].value.set( this.renderTargetMaskDownSampleBuffer.width, this.renderTargetMaskDownSampleBuffer.height );
				this.edgeDetectionMaterial.uniforms[ 'visibleEdgeColor' ].value = this.tempPulseColor1;
				this.edgeDetectionMaterial.uniforms[ 'hiddenEdgeColor' ].value = this.tempPulseColor2;
				renderer.setRenderTarget( this.renderTargetEdgeBuffer1 );
				renderer.clear();
				this.fsQuad.render( renderer ); // 4. Apply Blur on Half res

				this.fsQuad.material = this.separableBlurMaterial1;
				this.separableBlurMaterial1.uniforms[ 'colorTexture' ].value = this.renderTargetEdgeBuffer1.texture;
				this.separableBlurMaterial1.uniforms[ 'direction' ].value = OutlinePass.BlurDirectionX;
				this.separableBlurMaterial1.uniforms[ 'kernelRadius' ].value = this.edgeThickness;
				renderer.setRenderTarget( this.renderTargetBlurBuffer1 );
				renderer.clear();
				this.fsQuad.render( renderer );
				this.separableBlurMaterial1.uniforms[ 'colorTexture' ].value = this.renderTargetBlurBuffer1.texture;
				this.separableBlurMaterial1.uniforms[ 'direction' ].value = OutlinePass.BlurDirectionY;
				renderer.setRenderTarget( this.renderTargetEdgeBuffer1 );
				renderer.clear();
				this.fsQuad.render( renderer ); // Apply Blur on quarter res

				this.fsQuad.material = this.separableBlurMaterial2;
				this.separableBlurMaterial2.uniforms[ 'colorTexture' ].value = this.renderTargetEdgeBuffer1.texture;
				this.separableBlurMaterial2.uniforms[ 'direction' ].value = OutlinePass.BlurDirectionX;
				renderer.setRenderTarget( this.renderTargetBlurBuffer2 );
				renderer.clear();
				this.fsQuad.render( renderer );
				this.separableBlurMaterial2.uniforms[ 'colorTexture' ].value = this.renderTargetBlurBuffer2.texture;
				this.separableBlurMaterial2.uniforms[ 'direction' ].value = OutlinePass.BlurDirectionY;
				renderer.setRenderTarget( this.renderTargetEdgeBuffer2 );
				renderer.clear();
				this.fsQuad.render( renderer ); // Blend it additively over the input texture

				this.fsQuad.material = this.overlayMaterial;
				this.overlayMaterial.uniforms[ 'maskTexture' ].value = this.renderTargetMaskBuffer.texture;
				this.overlayMaterial.uniforms[ 'edgeTexture1' ].value = this.renderTargetEdgeBuffer1.texture;
				this.overlayMaterial.uniforms[ 'edgeTexture2' ].value = this.renderTargetEdgeBuffer2.texture;
				this.overlayMaterial.uniforms[ 'patternTexture' ].value = this.patternTexture;
				this.overlayMaterial.uniforms[ 'edgeStrength' ].value = this.edgeStrength;
				this.overlayMaterial.uniforms[ 'edgeGlow' ].value = this.edgeGlow;
				this.overlayMaterial.uniforms[ 'usePatternTexture' ].value = this.usePatternTexture;
				if ( maskActive ) renderer.state.buffers.stencil.setTest( true );
				renderer.setRenderTarget( readBuffer );
				this.fsQuad.render( renderer );
				renderer.setClearColor( this._oldClearColor, this.oldClearAlpha );
				renderer.autoClear = oldAutoClear;

			}

			if ( this.renderToScreen ) {

				this.fsQuad.material = this.materialCopy;
				this.copyUniforms[ 'tDiffuse' ].value = readBuffer.texture;
				renderer.setRenderTarget( null );
				this.fsQuad.render( renderer );

			}

		}

		getPrepareMaskMaterial() {

			return new THREE.ShaderMaterial( {
				uniforms: {
					'depthTexture': {
						value: null
					},
					'cameraNearFar': {
						value: new THREE.Vector2( 0.5, 0.5 )
					},
					'textureMatrix': {
						value: null
					}
				},
				vertexShader: `#include <morphtarget_pars_vertex>
				#include <skinning_pars_vertex>

				varying vec4 projTexCoord;
				varying vec4 vPosition;
				uniform mat4 textureMatrix;

				void main() {

					#include <skinbase_vertex>
					#include <begin_vertex>
					#include <morphtarget_vertex>
					#include <skinning_vertex>
					#include <project_vertex>

					vPosition = mvPosition;
					vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
					projTexCoord = textureMatrix * worldPosition;

				}`,
				fragmentShader: `#include <packing>
				varying vec4 vPosition;
				varying vec4 projTexCoord;
				uniform sampler2D depthTexture;
				uniform vec2 cameraNearFar;

				void main() {

					float depth = unpackRGBAToDepth(texture2DProj( depthTexture, projTexCoord ));
					float viewZ = - DEPTH_TO_VIEW_Z( depth, cameraNearFar.x, cameraNearFar.y );
					float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;
					gl_FragColor = vec4(0.0, depthTest, 1.0, 1.0);

				}`
			} );

		}

		getEdgeDetectionMaterial() {

			return new THREE.ShaderMaterial( {
				uniforms: {
					'maskTexture': {
						value: null
					},
					'texSize': {
						value: new THREE.Vector2( 0.5, 0.5 )
					},
					'visibleEdgeColor': {
						value: new THREE.Vector3( 1.0, 1.0, 1.0 )
					},
					'hiddenEdgeColor': {
						value: new THREE.Vector3( 1.0, 1.0, 1.0 )
					}
				},
				vertexShader: `varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
				fragmentShader: `varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform vec2 texSize;
				uniform vec3 visibleEdgeColor;
				uniform vec3 hiddenEdgeColor;

				void main() {
					vec2 invSize = 1.0 / texSize;
					vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);
					vec4 c1 = texture2D( maskTexture, vUv + uvOffset.xy);
					vec4 c2 = texture2D( maskTexture, vUv - uvOffset.xy);
					vec4 c3 = texture2D( maskTexture, vUv + uvOffset.yw);
					vec4 c4 = texture2D( maskTexture, vUv - uvOffset.yw);
					float diff1 = (c1.r - c2.r)*0.5;
					float diff2 = (c3.r - c4.r)*0.5;
					float d = length( vec2(diff1, diff2) );
					float a1 = min(c1.g, c2.g);
					float a2 = min(c3.g, c4.g);
					float visibilityFactor = min(a1, a2);
					vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visibleEdgeColor : hiddenEdgeColor;
					gl_FragColor = vec4(edgeColor, 1.0) * vec4(d);
				}`
			} );

		}

		getSeperableBlurMaterial( maxRadius ) {

			return new THREE.ShaderMaterial( {
				defines: {
					'MAX_RADIUS': maxRadius
				},
				uniforms: {
					'colorTexture': {
						value: null
					},
					'texSize': {
						value: new THREE.Vector2( 0.5, 0.5 )
					},
					'direction': {
						value: new THREE.Vector2( 0.5, 0.5 )
					},
					'kernelRadius': {
						value: 1.0
					}
				},
				vertexShader: `varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
				fragmentShader: `#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 texSize;
				uniform vec2 direction;
				uniform float kernelRadius;

				float gaussianPdf(in float x, in float sigma) {
					return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;
				}

				void main() {
					vec2 invSize = 1.0 / texSize;
					float weightSum = gaussianPdf(0.0, kernelRadius);
					vec4 diffuseSum = texture2D( colorTexture, vUv) * weightSum;
					vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);
					vec2 uvOffset = delta;
					for( int i = 1; i <= MAX_RADIUS; i ++ ) {
						float w = gaussianPdf(uvOffset.x, kernelRadius);
						vec4 sample1 = texture2D( colorTexture, vUv + uvOffset);
						vec4 sample2 = texture2D( colorTexture, vUv - uvOffset);
						diffuseSum += ((sample1 + sample2) * w);
						weightSum += (2.0 * w);
						uvOffset += delta;
					}
					gl_FragColor = diffuseSum/weightSum;
				}`
			} );

		}

		getOverlayMaterial() {

			return new THREE.ShaderMaterial( {
				uniforms: {
					'maskTexture': {
						value: null
					},
					'edgeTexture1': {
						value: null
					},
					'edgeTexture2': {
						value: null
					},
					'patternTexture': {
						value: null
					},
					'edgeStrength': {
						value: 1.0
					},
					'edgeGlow': {
						value: 1.0
					},
					'usePatternTexture': {
						value: 0.0
					}
				},
				vertexShader: `varying vec2 vUv;

				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
				fragmentShader: `varying vec2 vUv;

				uniform sampler2D maskTexture;
				uniform sampler2D edgeTexture1;
				uniform sampler2D edgeTexture2;
				uniform sampler2D patternTexture;
				uniform float edgeStrength;
				uniform float edgeGlow;
				uniform bool usePatternTexture;

				void main() {
					vec4 edgeValue1 = texture2D(edgeTexture1, vUv);
					vec4 edgeValue2 = texture2D(edgeTexture2, vUv);
					vec4 maskColor = texture2D(maskTexture, vUv);
					vec4 patternColor = texture2D(patternTexture, 6.0 * vUv);
					float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.5;
					vec4 edgeValue = edgeValue1 + edgeValue2 * edgeGlow;
					vec4 finalColor = edgeStrength * maskColor.r * edgeValue;
					if(usePatternTexture)
						finalColor += + visibilityFactor * (1.0 - maskColor.r) * (1.0 - patternColor.r);
					gl_FragColor = finalColor;
				}`,
				blending: THREE.AdditiveBlending,
				depthTest: false,
				depthWrite: false,
				transparent: true
			} );

		}

	}

	OutlinePass.BlurDirectionX = new THREE.Vector2( 1.0, 0.0 );
	OutlinePass.BlurDirectionY = new THREE.Vector2( 0.0, 1.0 );

	THREE.OutlinePass = OutlinePass;

} )();

/* ---- environments/RoomEnvironment.js ---- */
( function () {

	/**
 * https://github.com/google/model-viewer/blob/master/packages/model-viewer/src/three-components/EnvironmentScene.ts
 */

	class RoomEnvironment extends THREE.Scene {

		constructor() {

			super();
			const geometry = new THREE.BoxGeometry();
			geometry.deleteAttribute( 'uv' );
			const roomMaterial = new THREE.MeshStandardMaterial( {
				side: THREE.BackSide
			} );
			const boxMaterial = new THREE.MeshStandardMaterial();
			const mainLight = new THREE.PointLight( 0xffffff, 5.0, 28, 2 );
			mainLight.position.set( 0.418, 16.199, 0.300 );
			this.add( mainLight );
			const room = new THREE.Mesh( geometry, roomMaterial );
			room.position.set( - 0.757, 13.219, 0.717 );
			room.scale.set( 31.713, 28.305, 28.591 );
			this.add( room );
			const box1 = new THREE.Mesh( geometry, boxMaterial );
			box1.position.set( - 10.906, 2.009, 1.846 );
			box1.rotation.set( 0, - 0.195, 0 );
			box1.scale.set( 2.328, 7.905, 4.651 );
			this.add( box1 );
			const box2 = new THREE.Mesh( geometry, boxMaterial );
			box2.position.set( - 5.607, - 0.754, - 0.758 );
			box2.rotation.set( 0, 0.994, 0 );
			box2.scale.set( 1.970, 1.534, 3.955 );
			this.add( box2 );
			const box3 = new THREE.Mesh( geometry, boxMaterial );
			box3.position.set( 6.167, 0.857, 7.803 );
			box3.rotation.set( 0, 0.561, 0 );
			box3.scale.set( 3.927, 6.285, 3.687 );
			this.add( box3 );
			const box4 = new THREE.Mesh( geometry, boxMaterial );
			box4.position.set( - 2.017, 0.018, 6.124 );
			box4.rotation.set( 0, 0.333, 0 );
			box4.scale.set( 2.002, 4.566, 2.064 );
			this.add( box4 );
			const box5 = new THREE.Mesh( geometry, boxMaterial );
			box5.position.set( 2.291, - 0.756, - 2.621 );
			box5.rotation.set( 0, - 0.286, 0 );
			box5.scale.set( 1.546, 1.552, 1.496 );
			this.add( box5 );
			const box6 = new THREE.Mesh( geometry, boxMaterial );
			box6.position.set( - 2.193, - 0.369, - 5.547 );
			box6.rotation.set( 0, 0.516, 0 );
			box6.scale.set( 3.875, 3.487, 2.986 );
			this.add( box6 ); // -x right

			const light1 = new THREE.Mesh( geometry, createAreaLightMaterial( 50 ) );
			light1.position.set( - 16.116, 14.37, 8.208 );
			light1.scale.set( 0.1, 2.428, 2.739 );
			this.add( light1 ); // -x left

			const light2 = new THREE.Mesh( geometry, createAreaLightMaterial( 50 ) );
			light2.position.set( - 16.109, 18.021, - 8.207 );
			light2.scale.set( 0.1, 2.425, 2.751 );
			this.add( light2 ); // +x

			const light3 = new THREE.Mesh( geometry, createAreaLightMaterial( 17 ) );
			light3.position.set( 14.904, 12.198, - 1.832 );
			light3.scale.set( 0.15, 4.265, 6.331 );
			this.add( light3 ); // +z

			const light4 = new THREE.Mesh( geometry, createAreaLightMaterial( 43 ) );
			light4.position.set( - 0.462, 8.89, 14.520 );
			light4.scale.set( 4.38, 5.441, 0.088 );
			this.add( light4 ); // -z

			const light5 = new THREE.Mesh( geometry, createAreaLightMaterial( 20 ) );
			light5.position.set( 3.235, 11.486, - 12.541 );
			light5.scale.set( 2.5, 2.0, 0.1 );
			this.add( light5 ); // +y

			const light6 = new THREE.Mesh( geometry, createAreaLightMaterial( 100 ) );
			light6.position.set( 0.0, 20.0, 0.0 );
			light6.scale.set( 1.0, 0.1, 1.0 );
			this.add( light6 );

		}

	}

	function createAreaLightMaterial( intensity ) {

		const material = new THREE.MeshBasicMaterial();
		material.color.setScalar( intensity );
		return material;

	}

	THREE.RoomEnvironment = RoomEnvironment;

} )();

/* ---- geometries/RoundedBoxGeometry.js ---- */
( function () {

	const _tempNormal = new THREE.Vector3();

	function getUv( faceDirVector, normal, uvAxis, projectionAxis, radius, sideLength ) {

		const totArcLength = 2 * Math.PI * radius / 4; // length of the planes between the arcs on each axis

		const centerLength = Math.max( sideLength - 2 * radius, 0 );
		const halfArc = Math.PI / 4; // Get the vector projected onto the Y plane

		_tempNormal.copy( normal );

		_tempNormal[ projectionAxis ] = 0;

		_tempNormal.normalize(); // total amount of UV space alloted to a single arc


		const arcUvRatio = 0.5 * totArcLength / ( totArcLength + centerLength ); // the distance along one arc the point is at

		const arcAngleRatio = 1.0 - _tempNormal.angleTo( faceDirVector ) / halfArc;

		if ( Math.sign( _tempNormal[ uvAxis ] ) === 1 ) {

			return arcAngleRatio * arcUvRatio;

		} else {

			// total amount of UV space alloted to the plane between the arcs
			const lenUv = centerLength / ( totArcLength + centerLength );
			return lenUv + arcUvRatio + arcUvRatio * ( 1.0 - arcAngleRatio );

		}

	}

	class RoundedBoxGeometry extends THREE.BoxGeometry {

		constructor( width = 1, height = 1, depth = 1, segments = 2, radius = 0.1 ) {

			// ensure segments is odd so we have a plane connecting the rounded corners
			segments = segments * 2 + 1; // ensure radius isn't bigger than shortest side

			radius = Math.min( width / 2, height / 2, depth / 2, radius );
			super( 1, 1, 1, segments, segments, segments ); // if we just have one segment we're the same as a regular box

			if ( segments === 1 ) return;
			const geometry2 = this.toNonIndexed();
			this.index = null;
			this.attributes.position = geometry2.attributes.position;
			this.attributes.normal = geometry2.attributes.normal;
			this.attributes.uv = geometry2.attributes.uv; //

			const position = new THREE.Vector3();
			const normal = new THREE.Vector3();
			const box = new THREE.Vector3( width, height, depth ).divideScalar( 2 ).subScalar( radius );
			const positions = this.attributes.position.array;
			const normals = this.attributes.normal.array;
			const uvs = this.attributes.uv.array;
			const faceTris = positions.length / 6;
			const faceDirVector = new THREE.Vector3();
			const halfSegmentSize = 0.5 / segments;

			for ( let i = 0, j = 0; i < positions.length; i += 3, j += 2 ) {

				position.fromArray( positions, i );
				normal.copy( position );
				normal.x -= Math.sign( normal.x ) * halfSegmentSize;
				normal.y -= Math.sign( normal.y ) * halfSegmentSize;
				normal.z -= Math.sign( normal.z ) * halfSegmentSize;
				normal.normalize();
				positions[ i + 0 ] = box.x * Math.sign( position.x ) + normal.x * radius;
				positions[ i + 1 ] = box.y * Math.sign( position.y ) + normal.y * radius;
				positions[ i + 2 ] = box.z * Math.sign( position.z ) + normal.z * radius;
				normals[ i + 0 ] = normal.x;
				normals[ i + 1 ] = normal.y;
				normals[ i + 2 ] = normal.z;
				const side = Math.floor( i / faceTris );

				switch ( side ) {

					case 0:
						// right
						// generate UVs along Z then Y
						faceDirVector.set( 1, 0, 0 );
						uvs[ j + 0 ] = getUv( faceDirVector, normal, 'z', 'y', radius, depth );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'y', 'z', radius, height );
						break;

					case 1:
						// left
						// generate UVs along Z then Y
						faceDirVector.set( - 1, 0, 0 );
						uvs[ j + 0 ] = 1.0 - getUv( faceDirVector, normal, 'z', 'y', radius, depth );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'y', 'z', radius, height );
						break;

					case 2:
						// top
						// generate UVs along X then Z
						faceDirVector.set( 0, 1, 0 );
						uvs[ j + 0 ] = 1.0 - getUv( faceDirVector, normal, 'x', 'z', radius, width );
						uvs[ j + 1 ] = getUv( faceDirVector, normal, 'z', 'x', radius, depth );
						break;

					case 3:
						// bottom
						// generate UVs along X then Z
						faceDirVector.set( 0, - 1, 0 );
						uvs[ j + 0 ] = 1.0 - getUv( faceDirVector, normal, 'x', 'z', radius, width );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'z', 'x', radius, depth );
						break;

					case 4:
						// front
						// generate UVs along X then Y
						faceDirVector.set( 0, 0, 1 );
						uvs[ j + 0 ] = 1.0 - getUv( faceDirVector, normal, 'x', 'y', radius, width );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'y', 'x', radius, height );
						break;

					case 5:
						// back
						// generate UVs along X then Y
						faceDirVector.set( 0, 0, - 1 );
						uvs[ j + 0 ] = getUv( faceDirVector, normal, 'x', 'y', radius, width );
						uvs[ j + 1 ] = 1.0 - getUv( faceDirVector, normal, 'y', 'x', radius, height );
						break;

				}

			}

		}

	}

	THREE.RoundedBoxGeometry = RoundedBoxGeometry;

} )();
