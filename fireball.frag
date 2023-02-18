#version 300 es

precision highp float;

uniform float iTime;
uniform float seed;

in vec2 vTextureCoord;
in vec2 screenCoord;

out vec4 fragColor;

float hash(vec3 p)
{
    p = fract(p * 0.3183099 + .1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x)
{
    x += seed;
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0, 0, 0)),
    hash(i + vec3(1, 0, 0)), f.x),
    mix(hash(i + vec3(0, 1, 0)),
    hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)),
    hash(i + vec3(1, 0, 1)), f.x),
    mix(hash(i + vec3(0, 1, 1)),
    hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// noise function: https://www.shadertoy.com/view/4sfGzS

float constrain_scaled_distance(float dist, float scale, float max_len, float displacement) {
    float scaled_dist = dist * scale;
    float constrained_scaled_dist = smoothstep(0.8 * max_len, max_len, scaled_dist);
    return max(0., min(scaled_dist + displacement, max_len));
}

const float PI = 3.14;

void main()
{
    vec2 normalizedCoord = (vTextureCoord.xy - 0.5) * 2.0;
    float time_scale = min(iTime, 0.8);

    float distFromCenter = length(normalizedCoord);
    float distance_dimming = 1.5 - smoothstep(min(0.1, iTime), time_scale * 4., distFromCenter); // expand the explosion with time
    distance_dimming *= 1.- smoothstep(0.8, 1.2, distFromCenter); // dim the explosion at the edges (to avoid artifacts

    float explosion = 1. - smoothstep(min(iTime / 10., 0.005), min(0.01 + iTime / 1., 1.), distFromCenter); // ball of fire in the center

    float rings = fract(constrain_scaled_distance(distFromCenter, 4., 2., 2. - iTime * 3.)); // expanding rings around explosion
    rings *= rings; // increase contrast

    float timeDimming = 1. - smoothstep(0.5, 2., iTime);
    float brightness = (explosion*1.  + rings ) * distance_dimming * distance_dimming * timeDimming;

    float angle = atan(normalizedCoord.x, normalizedCoord.y);
    float normalizedAngle = (angle / PI);

    // slow-changing shape of noise, resembling flame
    float noize = noise(vec3(normalizedAngle * 4. + 0.5, distFromCenter * 4. - iTime * 1., normalizedCoord.x + normalizedCoord.y + iTime / 4.));

    float noizeBrightness = noize;
    // multiplied angle results in corona-like effect
    noizeBrightness += noise(vec3(normalizedAngle * 32. + 0.5, distFromCenter * 10. - iTime * 4., normalizedCoord.x + normalizedCoord.y + iTime / 4.)) / 2.;
    noizeBrightness += noise(vec3(normalizedAngle * 32. + 10.5, distFromCenter * 4. - iTime * 8., normalizedCoord.x + normalizedCoord.y + iTime / 4.)) / 4.;

    // very high-frequency noise produces effect akin to particles flying from the center
    noizeBrightness += noise(vec3(normalizedAngle * 320. + 102.5, distFromCenter * 6. - iTime * 5., normalizedCoord.x + normalizedCoord.y + iTime / 4.)) / 4.;

    // contrain the noise to the center, expanding with time
    noizeBrightness *= smoothstep(0.9 + 0.4*iTime/150., 0.4+ 0.4*iTime/150., distFromCenter) * distance_dimming;
    // contrast the noise
    noizeBrightness *= smoothstep(0.1, 3., noizeBrightness);
    // dim the noise with time
    noizeBrightness *= 1. - smoothstep(0.5, 2., iTime);

    float finalBrightness = (brightness + noizeBrightness * 0.5) * distance_dimming;

    // color mapping
    fragColor = vec4(finalBrightness, pow(max(finalBrightness, 0.), 2.) * 0.4, pow(max(finalBrightness, 0.), 3.) * 0.15, 1.0);
    fragColor.a = finalBrightness;

    // reduce opacity after 3 seconds during next 6 seconds
    float opacity = 1. - max((iTime - 3000.), 0.) / 6000.;
    fragColor *= opacity;
}
