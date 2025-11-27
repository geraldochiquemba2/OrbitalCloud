import { motion } from "framer-motion";

export default function CloudScene() {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      {/* Central glowing core */}
      <motion.div
        className="absolute w-32 h-32 bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 rounded-full shadow-2xl"
        style={{ boxShadow: "0 0 60px rgba(59, 130, 246, 0.8)" }}
        animate={{
          scale: [1, 1.15, 1],
          boxShadow: [
            "0 0 60px rgba(59, 130, 246, 0.8)",
            "0 0 100px rgba(59, 130, 246, 1)",
            "0 0 60px rgba(59, 130, 246, 0.8)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* Orbiting element 1 */}
      <motion.div
        className="absolute w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full shadow-lg"
        style={{ boxShadow: "0 0 40px rgba(34, 211, 238, 0.7)" }}
        animate={{
          x: [0, 150, 0, -150, 0],
          y: [100, 50, -100, 50, 100],
          scale: [0.8, 1, 0.8, 1, 0.8],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbiting element 2 */}
      <motion.div
        className="absolute w-16 h-16 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full shadow-lg"
        style={{ boxShadow: "0 0 30px rgba(253, 224, 71, 0.8)" }}
        animate={{
          x: [-150, 0, 150, 0, -150],
          y: [50, -100, 50, 100, 50],
          scale: [1, 0.8, 1, 0.8, 1],
          rotate: [0, 180, 360],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Orbiting element 3 */}
      <motion.div
        className="absolute w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full shadow-lg"
        style={{ boxShadow: "0 0 25px rgba(96, 165, 250, 0.7)" }}
        animate={{
          x: [100, -120, -80, 120, 100],
          y: [-80, 0, 100, -50, -80],
          scale: [0.9, 1.1, 0.9, 1, 0.9],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Floating data cube 1 */}
      <motion.div
        className="absolute w-6 h-6 bg-yellow-400 rounded-sm shadow-md"
        style={{ boxShadow: "0 0 15px rgba(250, 204, 21, 0.8)" }}
        animate={{
          y: [0, -50, 0],
          x: [0, 30, 0],
          rotateZ: [0, 180, 360],
          opacity: [0.4, 1, 0.4],
        }}
        transition={{ duration: 5, repeat: Infinity, delay: 0 }}
      />

      {/* Floating data cube 2 */}
      <motion.div
        className="absolute w-5 h-5 bg-cyan-400 rounded-sm shadow-md"
        style={{ boxShadow: "0 0 12px rgba(34, 211, 238, 0.8)" }}
        animate={{
          y: [0, 40, 0],
          x: [-40, 0, -40],
          rotateZ: [360, 180, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 6, repeat: Infinity, delay: 0.7 }}
      />

      {/* Floating data cube 3 */}
      <motion.div
        className="absolute w-4 h-4 bg-blue-400 rounded-sm shadow-sm"
        style={{ boxShadow: "0 0 10px rgba(59, 130, 246, 0.8)" }}
        animate={{
          y: [20, -30, 20],
          x: [30, -20, 30],
          rotateZ: [0, 270, 360],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{ duration: 7, repeat: Infinity, delay: 1.4 }}
      />

      {/* Ring orbit effect */}
      <motion.div
        className="absolute border-2 border-blue-400/30 rounded-full"
        style={{ width: 200, height: 200 }}
        animate={{ rotateZ: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      <motion.div
        className="absolute border-2 border-cyan-400/20 rounded-full"
        style={{ width: 280, height: 280 }}
        animate={{ rotateZ: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-blue-600/5 to-transparent rounded-full" />
    </div>
  );
}