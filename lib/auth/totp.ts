import { authenticator } from 'otplib'
import QRCode from 'qrcode'

export async function generateTOTP(email: string) {
  // Generate a random secret
  const secret = authenticator.generateSecret()

  // Create the otpauth URL
  const otpauthUrl = authenticator.keyuri(
    email,
    'Cashora',
    secret
  )

  // Generate QR code
  const qrCode = await QRCode.toDataURL(otpauthUrl)

  return {
    secret,
    qrCode
  }
}

export async function verifyTOTP(token: string, secret: string): Promise<boolean> {
  try {
    return authenticator.verify({
      token,
      secret
    })
  } catch (error) {
    console.error('Error verifying TOTP:', error)
    return false
  }
}
