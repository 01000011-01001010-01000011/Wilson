const skyFragmentShader = `
    varying vec3 vWorldPosition;
    varying vec3 vSunDirection;
    varying float vSunfade;
    varying vec3 vBetaR;
    varying vec3 vBetaM;
    varying float vSunE;

    uniform float mieDirectionalG;
    uniform vec3 up;
    
    uniform vec2 iResolution;
    uniform float iGlobalTime;
    uniform vec2 iPos;

    const vec3 cameraPos = vec3( 0.0, 0.0, 0.0 );

    // constants for atmospheric scattering
    const float pi = 3.141592653589793238462643383279502884197169;

    const float n = 1.0003; // refractive index of air
    const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

    // optical length at zenith for molecules
    const float rayleighZenithLength = 8.4E3;
    const float mieZenithLength = 1.25E3;
    // 66 arc seconds -> degrees, and the cosine of that
    const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

    // 3.0 / ( 16.0 * pi )
    const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
    // 1.0 / ( 4.0 * pi )
    const float ONE_OVER_FOURPI = 0.07957747154594767;

    float rayleighPhase( float cosTheta ) {
        return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
    }

    float hgPhase( float cosTheta, float g ) {
        float g2 = pow( g, 2.0 );
        float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
        return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
    }

    // CLOUDS 
    float hash( float n ) {
        return fract(sin(n)*43758.5453);
    }
    
    float noise( in vec3 x ) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f*f*(3.0-2.0*f);
        float n = p.x + p.y*57.0 + 113.0*p.z;
        return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                    mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
                mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                    mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
    }
    
    //vec3 sundir = vec3(vSunDirection);

    vec4 map( in vec3 p ) {
        float d = 0.2 - p.y;
        vec3 q = p - vec3(1.0,0.1,0.0)*iGlobalTime;
        float f;
        f  = 0.5000*noise( q ); q = q*2.02;
        f += 0.2500*noise( q ); q = q*2.03;
        f += 0.1250*noise( q ); q = q*2.01;
        f += 0.0625*noise( q );
        d += 3.0 * f;
        d = clamp( d, 0.0, 1.0 );
        vec4 res = vec4( d );
        res.xyz = mix( 1.15*vec3(1.0,0.95,0.8), vec3(0.7,0.7,0.7), res.x );
        return res;
    }
       
    vec4 raymarch( in vec3 ro, in vec3 rd ) {
        vec4 sum = vec4(0, 0, 0, 0);
        float t = 0.0;
        for(int i=0; i<64; i++) {            
            if( sum.a > 0.99 ) continue;

            vec3 pos = ro + t*rd;
            vec4 col = map( pos );
        
            #if 1
                float dif =  clamp((col.w - map(pos+0.3*vSunDirection).w)/0.6, 0.0, 1.0 );
                vec3 lin = vec3(0.65,0.68,0.7)*1.35 + 0.45*vec3(0.7, 0.5, 0.3)*dif;
                col.xyz *= lin;
            #endif
        
            col.a *= 0.35;
            col.rgb *= col.a;
            sum = sum + col*(1.0 - sum.a);	
            #if 0
                t += 0.1;
            #else
                t += max(0.1,0.025*t);
            #endif
        }

        sum.xyz /= (0.001+sum.w);
        return clamp( sum, 0.0, 1.0 );
    }       


    void main() {

        vec3 direction = normalize( vWorldPosition - cameraPos );      
      
        // optical length
        // cutoff angle at 90 to avoid singularity in next formula.
        float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
        float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
        float sR = rayleighZenithLength * inverse;
        float sM = mieZenithLength * inverse;

        // combined extinction factor
        vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

        // in scattering
        float cosTheta = dot( direction, vSunDirection );

        float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
        vec3 betaRTheta = vBetaR * rPhase;

        float mPhase = hgPhase( cosTheta, mieDirectionalG );
        vec3 betaMTheta = vBetaM * mPhase;

        vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
        Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );

        // nightsky
        float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
        float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
        vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
        vec3 L0 = vec3( 0.1 ) * Fex;

        // composition + solar disc
        float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
        L0 += ( vSunE * 19000.0 * Fex ) * sundisk;

        vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
        vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );
      
        vec2 q = gl_FragCoord.xy / iResolution.xy;
        vec2 p = -1.0 + 2.0*q;
        p.x *= iResolution.x / iResolution.y;       
        vec2 mo = 5.0 + 2.0*iPos.xy / iResolution.xy;
        
        // camera
        vec3 ro = 4.0*normalize(vec3(sin(2.75-3.0*mo.x), 0.7+(mo.y+1.0), cos(2.75-3.0*mo.x)));
        vec3 ta = vec3(1.0, 0.0, 0.0);
        vec3 ww = normalize( ta - ro);
        vec3 uu = normalize(cross( vec3(0.0,0.0,1.0), ww )); 
        vec3 vv = normalize(cross(ww,uu));
        vec3 rd = normalize( p.x*uu + p.y*vv + 1.5*ww );
        
        vec4 res = raymarch( ro, rd );
      
        float sun = clamp( dot(direction,rd), 0.0, 0.0 );
        vec3 col = vec3(0.6,0.71,0.75) - rd.y*0.2*vec3(1.0,0.5,1.0) + 0.15*0.5;
        col += 0.2*vec3(1.0,.6,0.1)*pow( sun, 8.0 );
        col *= 0.75; // Sky Color
        col = mix( col, res.xyz, res.w );
        col += 0.1*vec3(1.0,0.4,0.2)*pow( sun, 3.0 );
               
        retColor += col;
        
        gl_FragColor = vec4( retColor, 1.0 );

        #include <tonemapping_fragment>
        #include <encodings_fragment>

    }
`
export default skyFragmentShader;

/*  
        vec2 q = gl_FragCoord.xy / iResolution.xy;
        vec2 p = -1.0 + 2.0*q;
        p.x *= iResolution.x/ iResolution.y;
        vec2 mo = -1.0 + 2.0*iPos.xy / iResolution.xy;
        
        // camera
        vec3 ro = 4.0*normalize(vec3(sin(2.75-3.0*mo.x), 0.7+(mo.y+1.0), cos(2.75-3.0*mo.x)));
        vec3 ta = vec3(0.0, 0.0, 0.0);
        vec3 ww = normalize( ta - ro);
        vec3 uu = normalize(cross( vec3(0.0,1.0,0.0), ww )); // Vertical 
        vec3 vv = normalize(cross(ww,uu));
        vec3 rd = normalize( p.x*uu + p.y*vv + 1.5*ww );
        
        vec4 res = raymarch( ro, rd );
      
       // float sun = clamp( dot(direction, rd), 0.0, 0.0 );
        //retColor += vec3(0.6,0.71,0.75) - rd.y*0.2*vec3(1.0,0.5,1.0) + 0.15*0.5;
        //retColor += 0.2*vec3(1.0,.6,0.1)*pow( sundisk, 8.0 );
        //col *= 0.85; // Sky Color
        //retColor = mix( retColor, res.xyz, res.w );
        //retColor += 0.1*vec3(1.0,0.4,0.2)*pow( sundisk, 3.0 );
           
       */