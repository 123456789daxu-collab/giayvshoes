package com.example.be.service.impl;

import com.example.be.entity.*;
import com.example.be.repository.*;
import com.example.be.service.MaGeneratorService;
import com.example.be.service.ThuocTinhService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ThuocTinhServiceImpl implements ThuocTinhService {

    @Autowired private DanhMucRepository danhMucRepository;
    @Autowired private LoaiGiayRepository loaiGiayRepository;
    @Autowired private ThuongHieuRepository thuongHieuRepository;
    @Autowired private ChatLieuRepository chatLieuRepository;
    @Autowired private MauSacRepository mauSacRepository;
    @Autowired private CoGiayRepository coGiayRepository;
    @Autowired private MaGeneratorService maGeneratorService;

    private boolean isInvalidName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return true;
        }
        return !name.trim().matches("^[\\p{L}\\d\\s]+$");
    }

    // ─── Danh mục ───
    @Override
    public Page<DanhMuc> searchDanhMuc(String keyword, Boolean trangThai, Pageable pageable) {
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            return danhMucRepository.search(keyword, trangThai, pageable);
        }
        return danhMucRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public DanhMuc addDanhMuc(DanhMuc dm) {
        if (dm.getTenDanhMuc() == null || dm.getTenDanhMuc().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên danh mục không được để trống!");
        }
        String tenTrim = dm.getTenDanhMuc().trim();
        if (danhMucRepository.findByTenDanhMucIgnoreCase(tenTrim).isPresent()) {
            throw new IllegalStateException("Danh mục này đã tồn tại trong hệ thống.");
        }
        dm.setTenDanhMuc(tenTrim);
        if (dm.getMaDanhMuc() == null || dm.getMaDanhMuc().trim().isEmpty() || "(Tự động sinh)".equals(dm.getMaDanhMuc().trim())) {
            dm.setMaDanhMuc(maGeneratorService.generateMaDanhMuc());
        }
        dm.setTrangThai(true);
        return danhMucRepository.save(dm);
    }

    @Override
    @Transactional
    public DanhMuc updateDanhMuc(Long id, DanhMuc dm) {
        if (dm.getTenDanhMuc() == null || dm.getTenDanhMuc().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên danh mục không được để trống!");
        }
        String tenTrim = dm.getTenDanhMuc().trim();
        var existing = danhMucRepository.findByTenDanhMucIgnoreCase(tenTrim);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new IllegalStateException("Tên danh mục đã trùng với danh mục khác.");
        }
        DanhMuc old = danhMucRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy danh mục id=" + id));
        old.setTenDanhMuc(tenTrim);
        return danhMucRepository.save(old);
    }

    @Override
    @Transactional
    public void toggleStatusDanhMuc(Long id) {
        DanhMuc dm = danhMucRepository.findById(id).orElse(null);
        if (dm != null) {
            dm.setTrangThai(dm.getTrangThai() != null ? !dm.getTrangThai() : false);
            danhMucRepository.save(dm);
        }
    }

    @Override
    @Transactional
    public DanhMuc addQuickDanhMuc(String ten) {
        if (isInvalidName(ten)) {
            throw new IllegalArgumentException("Tên danh mục không được chứa ký tự đặc biệt!");
        }
        String nameTrim = ten.trim();
        if (danhMucRepository.findByTenDanhMucIgnoreCase(nameTrim).isPresent()) {
            throw new IllegalStateException("Danh mục đã tồn tại trong hệ thống!");
        }
        DanhMuc dm = new DanhMuc();
        dm.setMaDanhMuc(maGeneratorService.generateMaDanhMuc());
        dm.setTenDanhMuc(nameTrim);
        dm.setTrangThai(true);
        return danhMucRepository.save(dm);
    }

    @Override
    public List<DanhMuc> getAllDanhMuc() {
        return danhMucRepository.findAll();
    }

    // ─── Loại giày ───
    @Override
    public Page<LoaiGiay> searchLoaiGiay(String keyword, Boolean trangThai, Pageable pageable) {
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            return loaiGiayRepository.search(keyword, trangThai, pageable);
        }
        return loaiGiayRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public LoaiGiay addLoaiGiay(LoaiGiay lg) {
        if (lg.getTenLoaiGiay() == null || lg.getTenLoaiGiay().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên loại giày không được để trống!");
        }
        String tenTrim = lg.getTenLoaiGiay().trim();
        if (loaiGiayRepository.findByTenLoaiGiayIgnoreCase(tenTrim).isPresent()) {
            throw new IllegalStateException("Loại giày này đã tồn tại trong hệ thống.");
        }
        lg.setTenLoaiGiay(tenTrim);
        if (lg.getMaLoaiGiay() == null || lg.getMaLoaiGiay().trim().isEmpty() || "(Tự động sinh)".equals(lg.getMaLoaiGiay().trim())) {
            lg.setMaLoaiGiay(maGeneratorService.generateMaLoaiGiay());
        }
        lg.setTrangThai(true);
        return loaiGiayRepository.save(lg);
    }

    @Override
    @Transactional
    public LoaiGiay updateLoaiGiay(Long id, LoaiGiay lg) {
        if (lg.getTenLoaiGiay() == null || lg.getTenLoaiGiay().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên loại giày không được để trống!");
        }
        String tenTrim = lg.getTenLoaiGiay().trim();
        var existing = loaiGiayRepository.findByTenLoaiGiayIgnoreCase(tenTrim);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new IllegalStateException("Tên loại giày đã trùng với loại giày khác.");
        }
        LoaiGiay old = loaiGiayRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy loại giày id=" + id));
        old.setTenLoaiGiay(tenTrim);
        return loaiGiayRepository.save(old);
    }

    @Override
    @Transactional
    public void toggleStatusLoaiGiay(Long id) {
        LoaiGiay lg = loaiGiayRepository.findById(id).orElse(null);
        if (lg != null) {
            lg.setTrangThai(lg.getTrangThai() != null ? !lg.getTrangThai() : false);
            loaiGiayRepository.save(lg);
        }
    }

    @Override
    @Transactional
    public LoaiGiay addQuickLoaiGiay(String ten) {
        if (isInvalidName(ten)) {
            throw new IllegalArgumentException("Tên loại giày không được chứa ký tự đặc biệt!");
        }
        String nameTrim = ten.trim();
        if (loaiGiayRepository.findByTenLoaiGiayIgnoreCase(nameTrim).isPresent()) {
            throw new IllegalStateException("Loại giày đã tồn tại trong hệ thống!");
        }
        LoaiGiay lg = new LoaiGiay();
        lg.setMaLoaiGiay(maGeneratorService.generateMaLoaiGiay());
        lg.setTenLoaiGiay(nameTrim);
        lg.setTrangThai(true);
        return loaiGiayRepository.save(lg);
    }

    @Override
    public List<LoaiGiay> getAllLoaiGiay() {
        return loaiGiayRepository.findAll();
    }

    // ─── Thương hiệu ───
    @Override
    public Page<ThuongHieu> searchThuongHieu(String keyword, Boolean trangThai, Pageable pageable) {
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            return thuongHieuRepository.search(keyword, trangThai, pageable);
        }
        return thuongHieuRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public ThuongHieu addThuongHieu(ThuongHieu th) {
        if (th.getTenThuongHieu() == null || th.getTenThuongHieu().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên thương hiệu không được để trống!");
        }
        String tenTrim = th.getTenThuongHieu().trim();
        if (thuongHieuRepository.findByTenThuongHieuIgnoreCase(tenTrim).isPresent()) {
            throw new IllegalStateException("Thương hiệu này đã tồn tại trong hệ thống.");
        }
        th.setTenThuongHieu(tenTrim);
        if (th.getMaThuongHieu() == null || th.getMaThuongHieu().trim().isEmpty() || "(Tự động sinh)".equals(th.getMaThuongHieu().trim())) {
            th.setMaThuongHieu(maGeneratorService.generateMaThuongHieu());
        }
        th.setTrangThai(true);
        return thuongHieuRepository.save(th);
    }

    @Override
    @Transactional
    public ThuongHieu updateThuongHieu(Long id, ThuongHieu th) {
        if (th.getTenThuongHieu() == null || th.getTenThuongHieu().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên thương hiệu không được để trống!");
        }
        String tenTrim = th.getTenThuongHieu().trim();
        var existing = thuongHieuRepository.findByTenThuongHieuIgnoreCase(tenTrim);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new IllegalStateException("Tên thương hiệu đã trùng với thương hiệu khác.");
        }
        ThuongHieu old = thuongHieuRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy thương hiệu id=" + id));
        old.setTenThuongHieu(tenTrim);
        return thuongHieuRepository.save(old);
    }

    @Override
    @Transactional
    public void toggleStatusThuongHieu(Long id) {
        ThuongHieu th = thuongHieuRepository.findById(id).orElse(null);
        if (th != null) {
            th.setTrangThai(th.getTrangThai() != null ? !th.getTrangThai() : false);
            thuongHieuRepository.save(th);
        }
    }

    @Override
    @Transactional
    public ThuongHieu addQuickThuongHieu(String ten) {
        if (isInvalidName(ten)) {
            throw new IllegalArgumentException("Tên thương hiệu không được chứa ký tự đặc biệt!");
        }
        String nameTrim = ten.trim();
        if (thuongHieuRepository.findByTenThuongHieuIgnoreCase(nameTrim).isPresent()) {
            throw new IllegalStateException("Thương hiệu đã tồn tại trong hệ thống!");
        }
        ThuongHieu th = new ThuongHieu();
        th.setMaThuongHieu(maGeneratorService.generateMaThuongHieu());
        th.setTenThuongHieu(nameTrim);
        th.setTrangThai(true);
        return thuongHieuRepository.save(th);
    }

    @Override
    public List<ThuongHieu> getAllThuongHieu() {
        return thuongHieuRepository.findAll();
    }

    // ─── Chất liệu ───
    @Override
    public Page<ChatLieu> searchChatLieu(String keyword, Boolean trangThai, Pageable pageable) {
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            return chatLieuRepository.search(keyword, trangThai, pageable);
        }
        return chatLieuRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public ChatLieu addChatLieu(ChatLieu cl) {
        if (cl.getTenChatLieu() == null || cl.getTenChatLieu().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên chất liệu không được để trống!");
        }
        String tenTrim = cl.getTenChatLieu().trim();
        if (chatLieuRepository.findByTenChatLieuIgnoreCase(tenTrim).isPresent()) {
            throw new IllegalStateException("Chất liệu này đã tồn tại trong hệ thống.");
        }
        cl.setTenChatLieu(tenTrim);
        if (cl.getMaChatLieu() == null || cl.getMaChatLieu().trim().isEmpty() || "(Tự động sinh)".equals(cl.getMaChatLieu().trim())) {
            cl.setMaChatLieu(maGeneratorService.generateMaChatLieu());
        }
        cl.setTrangThai(true);
        return chatLieuRepository.save(cl);
    }

    @Override
    @Transactional
    public ChatLieu updateChatLieu(Long id, ChatLieu cl) {
        if (cl.getTenChatLieu() == null || cl.getTenChatLieu().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên chất liệu không được để trống!");
        }
        String tenTrim = cl.getTenChatLieu().trim();
        var existing = chatLieuRepository.findByTenChatLieuIgnoreCase(tenTrim);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new IllegalStateException("Tên chất liệu đã trùng với chất liệu khác.");
        }
        ChatLieu old = chatLieuRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy chất liệu id=" + id));
        old.setTenChatLieu(tenTrim);
        return chatLieuRepository.save(old);
    }

    @Override
    @Transactional
    public void toggleStatusChatLieu(Long id) {
        ChatLieu cl = chatLieuRepository.findById(id).orElse(null);
        if (cl != null) {
            cl.setTrangThai(cl.getTrangThai() != null ? !cl.getTrangThai() : false);
            chatLieuRepository.save(cl);
        }
    }

    @Override
    @Transactional
    public ChatLieu addQuickChatLieu(String ten) {
        if (isInvalidName(ten)) {
            throw new IllegalArgumentException("Tên chất liệu không được chứa ký tự đặc biệt!");
        }
        String nameTrim = ten.trim();
        if (chatLieuRepository.findByTenChatLieuIgnoreCase(nameTrim).isPresent()) {
            throw new IllegalStateException("Chất liệu đã tồn tại trong hệ thống!");
        }
        ChatLieu cl = new ChatLieu();
        cl.setMaChatLieu(maGeneratorService.generateMaChatLieu());
        cl.setTenChatLieu(nameTrim);
        cl.setTrangThai(true);
        return chatLieuRepository.save(cl);
    }

    @Override
    public List<ChatLieu> getAllChatLieu() {
        return chatLieuRepository.findAll();
    }

    // ─── Màu sắc ───
    @Override
    public Page<MauSac> searchMauSac(String keyword, Boolean trangThai, Pageable pageable) {
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            return mauSacRepository.search(keyword, trangThai, pageable);
        }
        return mauSacRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public MauSac addMauSac(MauSac ms) {
        if (ms.getTenMauSac() == null || ms.getTenMauSac().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên màu sắc không được để trống!");
        }
        String tenTrim = ms.getTenMauSac().trim();
        if (mauSacRepository.findByTenMauSacIgnoreCase(tenTrim).isPresent()) {
            throw new IllegalStateException("Màu sắc này đã tồn tại trong hệ thống.");
        }
        ms.setTenMauSac(tenTrim);
        if (ms.getMaMauSac() == null || ms.getMaMauSac().trim().isEmpty() || "(Tự động sinh)".equals(ms.getMaMauSac().trim())) {
            ms.setMaMauSac(maGeneratorService.generateMaMauSac());
        }
        ms.setTrangThai(true);
        return mauSacRepository.save(ms);
    }

    @Override
    @Transactional
    public MauSac updateMauSac(Long id, MauSac ms) {
        if (ms.getTenMauSac() == null || ms.getTenMauSac().trim().isEmpty()) {
            throw new IllegalArgumentException("Tên màu sắc không được để trống!");
        }
        String tenTrim = ms.getTenMauSac().trim();
        var existing = mauSacRepository.findByTenMauSacIgnoreCase(tenTrim);
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new IllegalStateException("Tên màu sắc đã trùng với màu sắc khác.");
        }
        MauSac old = mauSacRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy màu sắc id=" + id));
        old.setTenMauSac(tenTrim);
        return mauSacRepository.save(old);
    }

    @Override
    @Transactional
    public void toggleStatusMauSac(Long id) {
        MauSac ms = mauSacRepository.findById(id).orElse(null);
        if (ms != null) {
            ms.setTrangThai(ms.getTrangThai() != null ? !ms.getTrangThai() : false);
            mauSacRepository.save(ms);
        }
    }

    @Override
    @Transactional
    public MauSac addQuickMauSac(String ten) {
        if (isInvalidName(ten)) {
            throw new IllegalArgumentException("Tên màu sắc không được chứa ký tự đặc biệt!");
        }
        String nameTrim = ten.trim();
        if (mauSacRepository.findByTenMauSacIgnoreCase(nameTrim).isPresent()) {
            throw new IllegalStateException("Màu sắc đã tồn tại trong hệ thống!");
        }
        MauSac ms = new MauSac();
        ms.setMaMauSac(maGeneratorService.generateMaMauSac());
        ms.setTenMauSac(nameTrim);
        ms.setTrangThai(true);
        return mauSacRepository.save(ms);
    }

    @Override
    public List<MauSac> getAllMauSac() {
        return mauSacRepository.findAll();
    }

    // ─── Kích thước / Cổ giày ───
    @Override
    public Page<CoGiay> searchCoGiay(String keyword, Boolean trangThai, Pageable pageable) {
        if ((keyword != null && !keyword.isEmpty()) || trangThai != null) {
            return coGiayRepository.search(keyword, trangThai, pageable);
        }
        return coGiayRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public CoGiay addCoGiay(CoGiay cg) {
        if (cg.getSizeGiay() == null) {
            throw new IllegalArgumentException("Kích thước không được để trống!");
        }
        if (coGiayRepository.findBySizeGiay(cg.getSizeGiay()).isPresent()) {
            throw new IllegalStateException("Kích thước này đã tồn tại trong hệ thống.");
        }
        if (cg.getMaCoGiay() == null || cg.getMaCoGiay().trim().isEmpty() || "(Tự động sinh)".equals(cg.getMaCoGiay().trim())) {
            cg.setMaCoGiay(maGeneratorService.generateMaCoGiay());
        }
        cg.setTrangThai(true);
        return coGiayRepository.save(cg);
    }

    @Override
    @Transactional
    public CoGiay updateCoGiay(Long id, CoGiay cg) {
        if (cg.getSizeGiay() == null) {
            throw new IllegalArgumentException("Kích thước không được để trống!");
        }
        var existing = coGiayRepository.findBySizeGiay(cg.getSizeGiay());
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new IllegalStateException("Kích thước đã trùng với kích thước khác.");
        }
        CoGiay old = coGiayRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy kích thước id=" + id));
        old.setSizeGiay(cg.getSizeGiay());
        return coGiayRepository.save(old);
    }

    @Override
    @Transactional
    public void toggleStatusCoGiay(Long id) {
        CoGiay cg = coGiayRepository.findById(id).orElse(null);
        if (cg != null) {
            cg.setTrangThai(cg.getTrangThai() != null ? !cg.getTrangThai() : false);
            coGiayRepository.save(cg);
        }
    }

    @Override
    @Transactional
    public CoGiay addQuickCoGiay(String ten) {
        try {
            Integer size = Integer.parseInt(ten.trim());
            if (size < 30 || size > 50) {
                throw new IllegalArgumentException("Kích thước phải nằm trong khoảng từ 30 đến 50!");
            }
            if (coGiayRepository.findBySizeGiay(size).isPresent()) {
                throw new IllegalStateException("Kích thước " + size + " đã tồn tại trong hệ thống!");
            }
            CoGiay cg = new CoGiay();
            cg.setMaCoGiay(maGeneratorService.generateMaCoGiay());
            cg.setSizeGiay(size);
            cg.setTrangThai(true);
            return coGiayRepository.save(cg);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Kích thước phải là số nguyên!");
        }
    }

    @Override
    public List<CoGiay> getAllCoGiay() {
        return coGiayRepository.findAll();
    }
}
