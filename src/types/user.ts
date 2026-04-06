export interface CreateUserBody {
  email: string;
  name: string;
  password: string;
  profilePicture?: string;
  role: "USER" | "TENANT";
}
