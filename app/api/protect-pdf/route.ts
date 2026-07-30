import { NextResponse } from "next/server";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_PASSWORD_LENGTH = 127;

/**
 * Check whether the uploaded bytes start with the PDF signature.
 */
function isPdf(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 5) {
    return false;
  }

  const signature = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
    bytes[4],
  );

  return signature === "%PDF-";
}

/**
 * Clean the original filename before using it in response headers.
 */
function sanitizeFilename(filename: string): string {
  const cleanedFilename = filename
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedFilename || "document";
}

/**
 * Safely extract an error message.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Create a real ArrayBuffer for NextResponse.
 *
 * This avoids TypeScript errors caused by Uint8Array<ArrayBufferLike>
 * not always being accepted as BodyInit.
 */
function createResponseBuffer(bytes: Uint8Array): ArrayBuffer {
  const responseBuffer = new ArrayBuffer(bytes.byteLength);
  const responseBytes = new Uint8Array(responseBuffer);

  responseBytes.set(bytes);

  return responseBuffer;
}

export async function POST(
  request: Request,
): Promise<NextResponse> {
  try {
    const contentType =
      request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Content-Type must be multipart/form-data.",
        },
        {
          status: 415,
        },
      );
    }

    const formData = await request.formData();

    const uploadedFile = formData.get("file");
    const passwordValue = formData.get("password");
    const ownerPasswordValue =
      formData.get("ownerPassword");

    /*
     * Validate the uploaded file.
     */
    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a PDF file.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Validate the user/open password.
     */
    if (
      typeof passwordValue !== "string" ||
      passwordValue.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Password is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (passwordValue.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`,
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Validate the uploaded file size.
     */
    if (uploadedFile.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected PDF file is empty.",
        },
        {
          status: 400,
        },
      );
    }

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "PDF file size cannot exceed 50 MB.",
        },
        {
          status: 413,
        },
      );
    }

    const userPassword = passwordValue;

    /*
     * Use a separately supplied owner password when available.
     * Otherwise, generate one from the open password.
     */
    const ownerPassword =
      typeof ownerPasswordValue === "string" &&
      ownerPasswordValue.length > 0
        ? ownerPasswordValue
        : `${userPassword}-owner`;

    if (ownerPassword.length > MAX_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Owner password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`,
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Convert the uploaded PDF to Uint8Array.
     */
    const inputArrayBuffer =
      await uploadedFile.arrayBuffer();

    const inputBytes = new Uint8Array(
      inputArrayBuffer,
    );

    if (!isPdf(inputBytes)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected file is not a valid PDF document.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Correct @pdfsmaller/pdf-encrypt API:
     *
     * encryptPDF(
     *   pdfBytes,
     *   userPassword,
     *   options,
     * )
     *
     * ownerPassword and permissions belong inside options.
     */
    const encryptedBytes = await encryptPDF(
      inputBytes,
      userPassword,
      {
        ownerPassword,
        algorithm: "AES-256",

        allowPrinting: true,
        allowHighQualityPrint: true,

        allowModifying: false,
        allowCopying: false,
        allowAnnotating: false,

        allowFillingForms: true,
        allowExtraction: true,
        allowAssembly: false,
      },
    );

    /*
     * Normalize the library result.
     */
    const outputBytes =
      encryptedBytes instanceof Uint8Array
        ? encryptedBytes
        : new Uint8Array(encryptedBytes);

    if (outputBytes.byteLength === 0) {
      throw new Error(
        "The encryption library returned an empty file.",
      );
    }

    if (!isPdf(outputBytes)) {
      throw new Error(
        "The encryption library returned an invalid PDF.",
      );
    }

    const originalFilename = sanitizeFilename(
      uploadedFile.name,
    );

    const outputFilename =
      `${originalFilename}-protected.pdf`;

    const responseBody =
      createResponseBuffer(outputBytes);

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",

        "Content-Disposition":
          `attachment; filename="${outputFilename}"`,

        "Content-Length":
          outputBytes.byteLength.toString(),

        "Cache-Control":
          "no-store, no-cache, must-revalidate",

        Pragma: "no-cache",
        Expires: "0",

        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error(
      "PDF encryption error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to password-protect the PDF.",

        error:
          process.env.NODE_ENV === "development"
            ? getErrorMessage(error)
            : undefined,
      },
      {
        status: 500,
      },
    );
  }
}