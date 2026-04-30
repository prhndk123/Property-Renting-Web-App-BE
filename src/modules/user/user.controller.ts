import { Request, Response } from "express";
import { UserService } from "./user.service.js";

export class UserController {
  constructor(private userService: UserService) {}

  getUsers = async (req: Request, res: Response) => {
    const result = await this.userService.getUsers(req.query as any);
    res.status(200).send(result);
  };

  getUser = async (req: Request, res: Response) => {
    const result = await this.userService.getUser(req.params.id as string);
    res.status(200).send(result);
  };

  updateUser = async (req: Request, res: Response) => {
    const result = await this.userService.updateUser(
      req.params.id as string,
      req.body,
    );
    res.status(200).send(result);
  };

  updatePassword = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    if (authUser.id !== req.params.id) {
      res.status(403).json({ message: "You can only change your own password" });
      return;
    }
    const result = await this.userService.updatePassword(
      req.params.id as string,
      req.body,
    );
    res.status(200).send(result);
  };

  updateProfile = async (req: Request, res: Response) => {
    const authUser = res.locals.user;
    const result = await this.userService.updateProfile(
      req.params.id as string,
      req.body,
      authUser.id,
      authUser.role,
    );
    res.status(200).send(result);
  };

  deleteUser = async (req: Request, res: Response) => {
    const result = await this.userService.deleteUser(req.params.id as string);
    res.status(200).send(result);
  };

  getSavedProperties = async (req: Request, res: Response) => {
    const result = await this.userService.getSavedProperties(
      res.locals.user.id,
    );
    res.status(200).send(result);
  };

  getSavedPropertyIds = async (req: Request, res: Response) => {
    const result = await this.userService.getSavedPropertyIds(
      res.locals.user.id,
    );
    res.status(200).send(result);
  };

  addPaymentMethod = async (req: Request, res: Response) => {
    const result = await this.userService.addPaymentMethod(
      res.locals.user.id,
      req.body,
    );
    res.status(201).send(result);
  };

  getPaymentMethods = async (req: Request, res: Response) => {
    const result = await this.userService.getPaymentMethods(res.locals.user.id);
    res.status(200).send(result);
  };

  deletePaymentMethod = async (req: Request, res: Response) => {
    const result = await this.userService.deletePaymentMethod(
      res.locals.user.id,
      req.params.methodId as string,
    );
    res.status(200).send(result);
  };
}
