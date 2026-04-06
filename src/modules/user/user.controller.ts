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
    const result = await this.userService.updatePassword(
      req.params.id as string,
      req.body,
    );
    res.status(200).send(result);
  };

  updateProfile = async (req: Request, res: Response) => {
    const result = await this.userService.updateProfile(
      req.params.id as string,
      req.body,
    );
    res.status(200).send(result);
  };

  deleteUser = async (req: Request, res: Response) => {
    const result = await this.userService.deleteUser(req.params.id as string);
    res.status(200).send(result);
  };
}
