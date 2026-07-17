package org.film.management.exception;

import jakarta.ws.rs.core.Response;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public enum ErrorCode {

    MOVIE_NOT_FOUND(2001, "Không tìm thấy phim", Response.Status.NOT_FOUND),
    INVALID_PAGE(2002, "Trang phải >= 0", Response.Status.BAD_REQUEST),
    CREATE_MOVIE_FAILED(2003, "Tạo phim thất bại", Response.Status.BAD_REQUEST),
    CATEGORY_EXISTED(2004, "Thể loại đã tồn tại", Response.Status.BAD_REQUEST),
    CATEGORY_NOT_EXIST(2005, "Thể loại không tồn tại", Response.Status.NOT_FOUND),
    CATEGORY_IS_IN_USE(2006, "Thể loại đang được sử dụng", Response.Status.BAD_REQUEST),
    UPLOAD_ERROR(2007, "Lỗi khi tải file lên", Response.Status.BAD_REQUEST),
    MOVIE_IS_IN_USE(2008, "Phim đang được sử dụng nên không thể xóa", Response.Status.BAD_REQUEST),
    DELETE_SHOWTIME(2009, "Xóa lịch chiếu thất bại vì đã có vé được đặt", Response.Status.BAD_REQUEST),
    STATUS_SHOWTIME(2010, "Trạng thái lịch chiếu không hợp lệ!", Response.Status.BAD_REQUEST),
    INTERNAL_SERVER_ERROR(9999, "Lỗi hệ thống", Response.Status.INTERNAL_SERVER_ERROR);

    int code;
    String message;
    Response.Status statusCode;
}
