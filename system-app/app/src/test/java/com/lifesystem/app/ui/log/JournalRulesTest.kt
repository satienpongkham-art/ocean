package com.lifesystem.app.ui.log

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class JournalRulesTest {
    @Test fun threeNonEmptyLinesRequired() {
        assertTrue(journalComplete("วันนี้ฝึกครบ\nรู้สึกภูมิใจ\nพรุ่งนี้นอนเร็ว"))
        assertFalse(journalComplete("วันนี้ฝึกครบ\n\n   \nรู้สึกดี"))
        assertFalse(journalComplete(""))
        assertTrue(journalComplete(" a \n b \n c \n d "))
    }
}
