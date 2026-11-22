import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { ExportsController } from "../controllers/exports";

const router = Router();
const controller = new ExportsController();

router.use(authenticate);
router.post("/", (req, res) => controller.create(req, res));
router.get("/jobs/:id", (req, res) => controller.status(req, res));
router.get("/jobs/:id/download", (req, res) => controller.download(req, res));

export default router;
