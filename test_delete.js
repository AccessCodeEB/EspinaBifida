import { deleteById } from './src/models/servicios.model.js';
(async () => {
  try {
    await deleteById(1800); // 1800 is the service in the screenshot
    console.log("Success");
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
})();
