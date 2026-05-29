import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import * as ticketsRepo from "../db/tickets";

export function createTicketsRouter(upload: multer.Multer) {
  const router = Router();

  router.use(requireAuth);

  router.get("/tickets", async (req: AuthedRequest, res) => {
    try {
      const user = req.user!;
      const data = await ticketsRepo.getAllTickets(
        user.organizationId,
        user.role,
        user.id
      );
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load tickets" });
    }
  });

  router.post("/tickets", upload.array("files"), async (req: AuthedRequest, res) => {
    try {
      const user = req.user!;
      if (!user.employee) {
        return res.status(400).json({ error: "Employee profile required" });
      }
      const payload = JSON.parse(req.body.ticket);
      const fileNames =
        (req.files as Express.Multer.File[] | undefined)?.map((f) => f.filename) ?? [];
      const newTicket = await ticketsRepo.createTicket(
        user.organizationId,
        user.id,
        payload,
        fileNames
      );
      res.status(201).json(newTicket);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  router.patch(
    "/tickets/:id",
    requireRole("it_agent", "org_admin"),
    async (req: AuthedRequest, res) => {
      try {
        const user = req.user!;
        const updated = await ticketsRepo.updateTicket(
          req.params.id,
          user.organizationId,
          req.body
        );
        if (!updated) return res.status(404).send("Ticket not found");
        res.json(updated);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update ticket" });
      }
    }
  );

  router.post(
    "/tickets/:id/comments",
    requireRole("it_agent", "org_admin"),
    async (req: AuthedRequest, res) => {
    try {
      const user = req.user!;
      const canAccess = await ticketsRepo.canAccessTicket(
        req.params.id,
        user.organizationId,
        user.role,
        user.id
      );
      if (!canAccess) return res.status(404).send("Ticket not found");

      const author = user.employee?.fullName ?? user.email;
      const comment = await ticketsRepo.addTicketComment(
        req.params.id,
        user.organizationId,
        author,
        req.body.text
      );
      if (!comment) return res.status(404).send("Ticket not found");
      res.status(201).json(comment);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to add comment" });
    }
  }
  );

  router.get("/tickets/:id/files/:filename", async (req: AuthedRequest, res) => {
    try {
      const user = req.user!;
      const canAccess = await ticketsRepo.canAccessTicket(
        req.params.id,
        user.organizationId,
        user.role,
        user.id
      );
      if (!canAccess) return res.status(404).send("Not found");

      const files = await ticketsRepo.getTicketFileNames(
        req.params.id,
        user.organizationId
      );
      if (!files.includes(req.params.filename)) {
        return res.status(404).send("Not found");
      }

      const filePath = path.join(
        process.cwd(),
        "uploads",
        user.organizationId,
        req.params.filename
      );
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Not found");
      }
      res.sendFile(filePath);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load file" });
    }
  });

  return router;
}
