import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';


interface VoiceAssistantOrbProps {
  isListening?: boolean;
  isProcessing?: boolean;
  isRecording?: boolean;
  isSpeaking?: boolean;
  size?: number;
  onPress?: () => void;
  disabled?: boolean;
}

export default function VoiceAssistantOrb({ 
  isListening = false, 
  isProcessing = false,
  isRecording = false,
  isSpeaking = false,
  size = 300,
  onPress,
  disabled = false
}: VoiceAssistantOrbProps) {
  const sceneRef = useRef<THREE.Scene>(null);
  const rendererRef = useRef<Renderer>(null);
  const sphereRef = useRef<THREE.Points>(null);
  const particleMaterialRef = useRef<THREE.PointsMaterial>(null);
  const animationIdRef = useRef<number>(null);
  const isListeningRef = useRef(isListening);
  const isProcessingRef = useRef(isProcessing);
  const isRecordingRef = useRef(isRecording);
  const isSpeakingRef = useRef(isSpeaking);


  const onContextCreate = async (gl: any) => {
    // Initialize Three.js renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    rendererRef.current = renderer;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera  
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    // Create particle system for dots on sphere surface
    const particleCount = 500;
    
    // Create particle system for dots on sphere surface
    const positions = new Float32Array(particleCount * 3);
    
    // Generate points evenly distributed on sphere surface
    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      
      const radius = 2.2;
      positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
      positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ccff,
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    
    const sphere = new THREE.Points(particleGeometry, particleMaterial);
    sphereRef.current = sphere;
    particleMaterialRef.current = particleMaterial;
    scene.add(sphere);

    // Animation loop with state-based animations
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      if (sphereRef.current) {
        // Get current state from refs
        const currentListening = isListeningRef.current;
        const currentProcessing = isProcessingRef.current;
        const currentRecording = isRecordingRef.current;
        const currentSpeaking = isSpeakingRef.current;
        
        // Smooth rotation based on state (Z-axis only) - much slower
        const rotationSpeed = currentRecording ? 0.005 : currentListening ? 0.003 : currentSpeaking ? 0.004 : currentProcessing ? 0.004 : 0.001;
        sphereRef.current.rotation.z -= rotationSpeed;
        
        // Scale animation based on state
        const baseScale = 1;
        const pulseScale = currentRecording ? 0.08 : currentListening ? 0.03 : currentSpeaking ? 0.06 : currentProcessing ? 0.05 : 0.05;
        const pulse = Math.sin(Date.now() * 0.002) * pulseScale;
        sphereRef.current.scale.setScalar(baseScale + pulse);
      }
      
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    
    animate();
  };

  useEffect(() => {
    // Update refs so animation loop can access current state
    isListeningRef.current = isListening;
    isProcessingRef.current = isProcessing;
    isRecordingRef.current = isRecording;
    isSpeakingRef.current = isSpeaking;
    
    // Update color immediately when props change
    if (particleMaterialRef.current) {
      if (isRecording) {
        particleMaterialRef.current.color.setHex(0xff0066); // Red for recording
      } else if (isListening) {
        particleMaterialRef.current.color.setHex(0x9966ff); // Purple for auto-listening/monitoring
      } else if (isSpeaking) {
        particleMaterialRef.current.color.setHex(0x00ff00); // Green for speaking
      } else {
        particleMaterialRef.current.color.setHex(0x00ccff); // Blue for idle/processing
      }
    }
  }, [isListening, isProcessing, isRecording, isSpeaking]);

  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { width: size, height: size },
        disabled && styles.disabledContainer
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        isRecording ? "Recording speech" : 
        isListening ? "Monitoring for voice" : 
        isSpeaking ? "Claude is speaking" : 
        "Start conversation"
      }
      accessibilityHint={
        isListening ? "Auto-listening enabled. Speak naturally to start recording." : 
        "Tap to start conversation with Claude"
      }
    >
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  disabledContainer: {
    opacity: 0.5,
  },
  glView: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});