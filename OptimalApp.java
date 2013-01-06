import static spark.Spark.*;
import spark.*;
import org.apache.commons.io.*;
import java.io.*;

public class OptimalApp {
  public static void main(String[] args) {

    setPort(8000);
    
    get(new Route("/") {
        @Override
        public Object handle(Request request, Response response) {
          try {

            byte[] out = IOUtils.toByteArray(new FileInputStream("index.htm"));
            response.raw().setContentType("text/html;charset=utf-8");
            response.raw().getOutputStream().write(out, 0, out.length);
            return " "; // TODO

          } catch (FileNotFoundException e) {
            response.status(404);
            return "File not found";
          } catch (IOException e) {
            response.status(503);
            return "Server error";
          }
        }
      });
    
    get(new Route("/:filetype/:filename") {
        @Override
        public Object handle(Request request, Response response) {
          try {

            String path = request.params(":filetype") + "/" + request.params(":filename");
            byte[] out = IOUtils.toByteArray(new FileInputStream(path));
            
            // set MIME type
            if (request.params(":filetype").equals("css")) {
              response.raw().setContentType("text/css;charset=utf-8");
            } else if (request.params(":filetype").equals("js")) {
              response.raw().setContentType("text/javascript;charset=utf-8");
            } else if (request.params(":filetype").equals("img")) {
              response.raw().setContentType("image/png;charset=utf-8");
            } else if (request.params(":filetype").equals("font")) {
              response.raw().setContentType("application/octet-stream;charset=utf-8");
            }
            // success
            response.raw().getOutputStream().write(out, 0, out.length);
            return " "; // TODO

          } catch (FileNotFoundException e) {
            response.status(404);
            return "File not found";
          } catch (IOException e) {
            response.status(503);
            return "Server error";
          }
        }
      });
    
  }
}