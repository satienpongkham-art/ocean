package com.lifesystem.app

import com.lifesystem.app.backup.BackupCrypto
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BackupCryptoTest {
    @Test fun roundTrip_wrongPasswordFails_tamperFails() {
        val data = "SQLite format 3\u0000 hello".toByteArray()
        val enc = BackupCrypto.encrypt(data, "pass1234".toCharArray())
        assertArrayEquals(data, BackupCrypto.decrypt(enc, "pass1234".toCharArray()))
        assertNull(BackupCrypto.decrypt(enc, "wrong".toCharArray()))
        assertNull(BackupCrypto.decrypt(enc.copyOf().also { it[it.size - 1] = (it[it.size - 1] + 1).toByte() }, "pass1234".toCharArray()))
        assertNull(BackupCrypto.decrypt("nope".toByteArray(), "x".toCharArray()))
    }
}
