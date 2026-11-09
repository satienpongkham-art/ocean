package com.lifesystem.app.backup

import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/** Backup file = "SYS1" + salt(16) + iv(12) + AES-256-GCM(ciphertext). Key from the user's password (PBKDF2, 120k rounds). */
object BackupCrypto {
    private val MAGIC = "SYS1".toByteArray()
    private const val ITERATIONS = 120_000

    private fun key(password: CharArray, salt: ByteArray) =
        SecretKeySpec(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(PBEKeySpec(password, salt, ITERATIONS, 256)).encoded, "AES")

    fun encrypt(plain: ByteArray, password: CharArray): ByteArray {
        val rnd = SecureRandom()
        val salt = ByteArray(16).also(rnd::nextBytes)
        val iv = ByteArray(12).also(rnd::nextBytes)
        val c = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key(password, salt), GCMParameterSpec(128, iv)) }
        return MAGIC + salt + iv + c.doFinal(plain)
    }

    /** Null when the password is wrong or the file is not a System backup. */
    fun decrypt(data: ByteArray, password: CharArray): ByteArray? = runCatching {
        require(data.size > 32 && data.copyOfRange(0, 4).contentEquals(MAGIC))
        val salt = data.copyOfRange(4, 20); val iv = data.copyOfRange(20, 32)
        Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(password, salt), GCMParameterSpec(128, iv)) }.doFinal(data.copyOfRange(32, data.size))
    }.getOrNull()
}
